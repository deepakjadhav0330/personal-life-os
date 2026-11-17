// ─────────────────────────────────────────────────────────────
// Analytics Client
// ─────────────────────────────────────────────────────────────
// - Queues events in memory
// - Persists offline events to IndexedDB (analytics_queue table)
// - Flushes to Supabase ingest-events Edge Function in batches
// - Deduplicates via event_key (UUID) — server uses ON CONFLICT DO NOTHING
// - Never throws — analytics failure must never break the app
// ─────────────────────────────────────────────────────────────

import { db } from '../db/database';
import type { QueuedAnalyticsEvent } from '../db/schema';
import type { EventName, EventProperties } from './events';

const BATCH_SIZE = 20;
const FLUSH_DEBOUNCE_MS = 2000;

class AnalyticsClient {
  private queue: QueuedAnalyticsEvent[] = [];
  private sessionId: string | null = null;
  private accessToken: string | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;

  // ── Public API ──────────────────────────────────────────────

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  track(eventName: EventName, properties: EventProperties = {}): void {
    if (!this.accessToken) return; // not authenticated — skip silently

    const event: QueuedAnalyticsEvent = {
      event_key: crypto.randomUUID(),
      event_name: eventName,
      // Strip undefined values to get a clean Record<string, string | number | boolean>
      properties: Object.fromEntries(
        Object.entries(properties).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number | boolean>,
      occurred_at: new Date().toISOString(),
      session_id: this.sessionId ?? undefined,
    };

    this.queue.push(event);
    this.scheduleFlush();
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0 || !this.accessToken) return;
    this.isFlushing = true;

    const batch = this.queue.splice(0, BATCH_SIZE);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('No Supabase URL');

      const response = await fetch(`${supabaseUrl}/functions/v1/ingest-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ events: batch }),
      });

      if (response.status === 401 || response.status === 403) {
        // Suspended or unauthenticated — drop events, do not retry
        await this.removeFromPersisted(batch);
        return;
      }

      if (!response.ok) {
        // Server error — persist and retry later
        throw new Error(`ingest-events returned ${response.status}`);
      }

      // Success — remove from persisted queue if they were stored there
      await this.removeFromPersisted(batch);
    } catch {
      // Network failure or any other error — persist to IndexedDB
      this.queue.unshift(...batch);
      await this.persistBatch(batch);
    } finally {
      this.isFlushing = false;
      // If more events queued up during flush, schedule another flush
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  async loadPersistedQueue(): Promise<void> {
    try {
      const persisted = await db.analyticsQueue.toArray();
      if (persisted.length > 0) {
        // Prepend persisted events (oldest first)
        this.queue.unshift(...persisted);
        this.scheduleFlush();
      }
    } catch {
      // Silently ignore — offline or DB error
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
      // bulkPut uses event_key unique index — no duplicate persisting
      await db.analyticsQueue.bulkPut(batch);
    } catch {
      // Silently ignore persistence errors
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
