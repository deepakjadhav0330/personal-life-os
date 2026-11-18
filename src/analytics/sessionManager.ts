// ─────────────────────────────────────────────────────────────
// Session Manager — fixes applied:
//   2. Session key scoped to userId: lifeOS_session_{userId}
//      Cleared from sessionStorage on stop() — no cross-user reuse
//   3. Activity listeners stored in Map and removed on stop() — no leak
//   4. start() is idempotent: same user + active session = no-op
// ─────────────────────────────────────────────────────────────

import { analytics } from './analyticsClient';

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL_MS   =  5 * 60 * 1000; // 5 minutes

function sessionStorageKey(userId: string): string {
  return `lifeOS_session_${userId}`;
}

export function detectPlatform(): string {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return 'pwa-ios';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa-android';
  return 'web';
}

class SessionManager {
  private sessionKey:    string | null = null;
  private sessionDbId:   string | null = null;
  private accessToken:   string | null = null;
  private userId:        string | null = null;
  private isStarted      = false;
  private sessionStartedAt = Date.now();

  private heartbeatTimer:  ReturnType<typeof setInterval>  | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout>   | null = null;
  private visibilityHandler: (() => void) | null = null;
  private unloadHandler:     (() => void) | null = null;
  // Stored references so they can be properly removed on stop()
  private activityHandlers: Map<string, EventListener> = new Map();

  async start(accessToken: string, userId: string): Promise<void> {
    // Idempotent: same user, already started → no-op
    if (this.isStarted && this.userId === userId) return;

    // Different user (account switch) — clean up previous session first
    if (this.isStarted) this.stop();

    this.accessToken = accessToken;
    this.userId      = userId;
    this.isStarted   = true;

    const storageKey = sessionStorageKey(userId);
    const existing   = sessionStorage.getItem(storageKey);
    const isNew      = !existing;
    const key        = existing ?? crypto.randomUUID();

    if (!existing) sessionStorage.setItem(storageKey, key);

    this.sessionKey       = key;
    this.sessionStartedAt = Date.now();

    if (isNew) {
      await this.createSessionRecord(key);
      analytics.track('session_started', { platform: detectPlatform(), session_key: key });
    } else {
      this.sessionDbId = key;
    }

    analytics.setSessionId(this.sessionDbId ?? key);
    this.startHeartbeat();
    this.setupActivityListeners();
    this.setupVisibilityListener();
    this.setupUnloadListener();
    this.resetInactivityTimer();
  }

  recordActivity(): void {
    this.resetInactivityTimer();
  }

  stop(): void {
    if (this.heartbeatTimer)  { clearInterval(this.heartbeatTimer);  this.heartbeatTimer  = null; }
    if (this.inactivityTimer) { clearTimeout(this.inactivityTimer);  this.inactivityTimer = null; }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      window.removeEventListener('pagehide',     this.unloadHandler);
      this.unloadHandler = null;
    }

    // Remove every stored activity listener reference — no leak
    for (const [eventName, handler] of this.activityHandlers) {
      window.removeEventListener(eventName, handler);
    }
    this.activityHandlers.clear();

    // Clear scoped session key so the next user gets a fresh session
    if (this.userId) sessionStorage.removeItem(sessionStorageKey(this.userId));

    this.sessionKey  = null;
    this.sessionDbId = null;
    this.accessToken = null;
    this.userId      = null;
    this.isStarted   = false;
    analytics.setSessionId('');
  }

  private async createSessionRecord(key: string): Promise<void> {
    if (!this.accessToken) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          session_key: key,
          started_at:  new Date().toISOString(),
          platform:    detectPlatform(),
          app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
        }),
      });

      if (res.ok) {
        const data = await res.json() as { id?: string };
        if (data.id) { this.sessionDbId = data.id; analytics.setSessionId(data.id); }
      }
    } catch { /* network failure — session estimated from heartbeats */ }
  }

  private async endSessionRecord(isEstimated: boolean): Promise<void> {
    if (!this.sessionKey || !this.accessToken) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const durationSeconds = Math.round((Date.now() - this.sessionStartedAt) / 1000);
      analytics.track('session_ended', { duration_seconds: durationSeconds, is_estimated: isEstimated });
      analytics.flush();

      await fetch(`${supabaseUrl}/functions/v1/end-session`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          session_key:  this.sessionKey,
          ended_at:     new Date().toISOString(),
          is_estimated: isEstimated,
        }),
        keepalive: true,
      });
    } catch { /* silent */ }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      if (!this.sessionKey || !this.accessToken) return;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) return;
        await fetch(`${supabaseUrl}/functions/v1/update-session`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.accessToken}` },
          body:    JSON.stringify({ session_key: this.sessionKey }),
        });
      } catch { /* silent */ }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      this.endSessionRecord(false).catch(() => {});
      if (this.userId) sessionStorage.removeItem(sessionStorageKey(this.userId));
      this.sessionKey = null;
      this.sessionDbId = null;
    }, INACTIVITY_THRESHOLD_MS);
  }

  private setupActivityListeners(): void {
    const events = ['click', 'keydown', 'touchstart', 'scroll'] as const;
    for (const eventName of events) {
      const handler: EventListener = () => this.recordActivity();
      this.activityHandlers.set(eventName, handler);
      window.addEventListener(eventName, handler, { passive: true });
    }
  }

  private setupVisibilityListener(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.resetInactivityTimer();
      } else {
        if (!this.sessionKey && this.accessToken && this.userId) {
          this.start(this.accessToken, this.userId).catch(() => {});
        } else {
          this.recordActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupUnloadListener(): void {
    this.unloadHandler = () => { this.endSessionRecord(false).catch(() => {}); };
    window.addEventListener('pagehide',     this.unloadHandler);
    window.addEventListener('beforeunload', this.unloadHandler);
  }
}

export const sessionManager = new SessionManager();
