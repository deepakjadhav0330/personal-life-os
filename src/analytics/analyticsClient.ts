// ─────────────────────────────────────────────────────────────
// Analytics Client
// ─────────────────────────────────────────────────────────────
// Fixes applied:
//   1. Events are user-scoped: user_id stored in queue, only current
//      user's events are flushed — prevents cross-user attribution
//   2. Queue cleared when user switches (logout / account switch)
// ─────────────────────────────────────────────────────────────

import { db } from '../db/database';
import type { QueuedAnalyticsEvent } from '../db/schema';
import type { EventName, EventProperties } from './events';

const BATCH_SIZE       = 20;
const FLUSH_DEBOUNCE_MS = 2000;

class AnalyticsClient {
  private queue: QueuedAnalyticsEvent[] = [];
  private sessionId:   string | null = null;
  private accessToken: string | null = null;
  private userId:      string | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;

  // ── Public API ──────────────────────────────────────────────

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  /**
   * Update the access token and authenticated user.
   * When the user changes (logout / account switch):
   *   - In-memory queue is cleared (events only flushed for the active user)
   *   - Persisted events for PREVIOUS user are kept in IndexedDB, keyed to
   *     their userId — they will flush when that user signs back in.
   *   - Only legacy orphaned events (no user_id) are pruned.
   */
  setAccessToken(token: string | null, userId?: string | null): void {
    const userChanged = userId !== undefined && userId !== this.userId;

    if (userChanged) {
      // Drop in-memory events only — do NOT delete persisted events for the
      // previous user. They stay in IndexedDB keyed to their user_id and will
      // flush when that user authenticates again.
      this.queue = [];
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      // Only purge legacy orphaned events that have no user_id attribution
      // (created before the user-scoping fix was deployed).
      db.analyticsQueue
        .filter(e => !e.user_id)
        .delete()
        .catch(() => {/* silent */});
    }

    this.accessToken = token;
    if (userId !== undefined) this.userId = userId ?? null;
  }

  track(eventName: EventName, properties: EventProperties = {}): void {
    if (!this.accessToken || !this.userId) return;

    const event: QueuedAnalyticsEvent = {
      event_key:   crypto.randomUUID(),
      event_name:  eventName,
      user_id:     this.userId,
      properties:  Object.fromEntries(
        Object.entries(properties).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number | boolean>,
      occurred_at: new Date().toISOString(),
      session_id:  this.sessionId ?? undefined,
    };

    this.queue.push(event);
    this.scheduleFlush();
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0 || !this.accessToken || !this.userId) return;
    this.isFlushing = true;

    // Only flush events that belong to the current user
    const myEvents = this.queue.filter(e => e.user_id === this.userId);
    const others   = this.queue.filter(e => e.user_id !== this.userId);
    this.queue = others; // keep other-user events in queue (they will be dropped on next setAccessToken)

    if (myEvents.length === 0) {
      this.isFlushing = false;
      return;
    }

    const batch = myEvents.splice(0, BATCH_SIZE);
    // Put un-batched events back
    this.queue = [...others, ...myEvents];

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('No Supabase URL');

      const response = await fetch(`${supabaseUrl}/functions/v1/ingest-events`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ events: batch }),
      });

      if (response.status === 401 || response.status === 403) {
        // Suspended or unauthenticated — drop current batch, do not retry
        await this.removeFromPersisted(batch);
        return;
      }

      if (!response.ok) {
        throw new Error(`ingest-events returned ${response.status}`);
      }

      await this.removeFromPersisted(batch);
    } catch {
      // Network failure — persist for retry
      this.queue.unshift(...batch);
      await this.persistBatch(batch);
    } finally {
      this.isFlushing = false;
      if (this.queue.some(e => e.user_id === this.userId)) {
        this.scheduleFlush();
      }
    }
  }

  /**
   * Load persisted events for the CURRENT user only.
   * Other users' events stay in the queue — they flush when that user logs in.
   */
  async loadPersistedQueue(): Promise<void> {
    if (!this.userId) return;
    try {
      const myEvents = await db.analyticsQueue
        .where('user_id')
        .equals(this.userId)
        .toArray();

      if (myEvents.length > 0) {
        this.queue.unshift(...myEvents);
        this.scheduleFlush();
      }

      // Only prune orphaned legacy events (no user_id) — never touch other users'
      await db.analyticsQueue
        .filter(e => !e.user_id)
        .delete();
    } catch {
      // Silently ignore
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flush().catch(() => {/* silent */});
    }, FLUSH_DEBOUNCE_MS);
  }

  private async persistBatch(batch: QueuedAnalyticsEvent[]): Promise<void> {
    try {
      await db.analyticsQueue.bulkPut(batch);
    } catch {
      // Silently ignore
    }
  }

  private async removeFromPersisted(batch: QueuedAnalyticsEvent[]): Promise<void> {
    try {
      const keys = batch.map(e => e.event_key);
      await db.analyticsQueue.where('event_key').anyOf(keys).delete();
    } catch {
      // Silently ignore
    }
  }
}

// Singleton — shared across the entire app
export const analytics = new AnalyticsClient();
