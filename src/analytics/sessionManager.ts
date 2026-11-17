// ─────────────────────────────────────────────────────────────
// Session Manager
// ─────────────────────────────────────────────────────────────
// Tracks the lifecycle of a user session:
//   - session_key in sessionStorage survives page refresh (no double-count)
//   - Heartbeat every 5 min keeps ended_at current for duration estimation
//   - Inactivity threshold (30 min) ends the session automatically
//   - visibilitychange + beforeunload + pagehide handle close/background
//   - keepalive fetch ensures the end-session call lands even on tab close
// ─────────────────────────────────────────────────────────────

import { analytics } from './analyticsClient';

const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL_MS   =  5 * 60 * 1000; // 5 minutes
const SESSION_KEY_STORAGE     = 'lifeOS_session_key';

function detectPlatform(): string {
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return 'pwa-ios';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa-android';
  return 'web';
}

class SessionManager {
  private sessionKey: string | null = null;
  private sessionDbId: string | null = null;
  private accessToken: string | null = null;
  private sessionStartedAt = Date.now();
  private heartbeatTimer:   ReturnType<typeof setInterval>  | null = null;
  private inactivityTimer:  ReturnType<typeof setTimeout>   | null = null;
  private visibilityHandler: (() => void) | null = null;
  private unloadHandler:     (() => void) | null = null;

  // ── Start or resume a session ──────────────────────────────

  async start(accessToken: string): Promise<void> {
    this.accessToken = accessToken;

    const existing = sessionStorage.getItem(SESSION_KEY_STORAGE);
    const isNew    = !existing;
    const key      = existing ?? crypto.randomUUID();

    if (!existing) {
      sessionStorage.setItem(SESSION_KEY_STORAGE, key);
    }
    this.sessionKey      = key;
    this.sessionStartedAt = Date.now();

    if (isNew) {
      await this.createSessionRecord(key);
      analytics.track('session_started', {
        platform:    detectPlatform(),
        session_key: key,
      });
    } else {
      // Page refresh — reuse existing session ID without firing session_started again
      this.sessionDbId = key; // fallback; real ID fetched asynchronously if needed
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
    if (this.heartbeatTimer)   clearInterval(this.heartbeatTimer);
    if (this.inactivityTimer)  clearTimeout(this.inactivityTimer);
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.unloadHandler) {
      window.removeEventListener('beforeunload', this.unloadHandler);
      window.removeEventListener('pagehide',     this.unloadHandler);
    }
    this.sessionKey   = null;
    this.sessionDbId  = null;
    this.accessToken  = null;
    analytics.setSessionId('');
  }

  // ── Private helpers ─────────────────────────────────────────

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
        if (data.id) {
          this.sessionDbId = data.id;
          analytics.setSessionId(data.id);
        }
      }
    } catch {
      // Network failure — continue without DB session record
    }
  }

  private async endSessionRecord(isEstimated: boolean): Promise<void> {
    if (!this.sessionKey || !this.accessToken) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const durationSeconds = Math.round((Date.now() - this.sessionStartedAt) / 1000);
      analytics.track('session_ended', {
        duration_seconds: durationSeconds,
        is_estimated:     isEstimated,
      });
      analytics.flush();

      await fetch(`${supabaseUrl}/functions/v1/end-session`, {
        method:    'POST',
        headers:   {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          session_key:   this.sessionKey,
          ended_at:      new Date().toISOString(),
          is_estimated:  isEstimated,
        }),
        // keepalive ensures delivery even if the page is closing
        keepalive: true,
      });
    } catch {
      // Silent — session end estimation handles missing records
    }
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
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ session_key: this.sessionKey }),
        });
      } catch {
        // Silent heartbeat failure
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

    this.inactivityTimer = setTimeout(() => {
      // Session expired due to inactivity
      this.endSessionRecord(false).catch(() => {/* silent */});
      sessionStorage.removeItem(SESSION_KEY_STORAGE);
      this.sessionKey  = null;
      this.sessionDbId = null;
    }, INACTIVITY_THRESHOLD_MS);
  }

  private setupActivityListeners(): void {
    const events = ['click', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(e =>
      window.addEventListener(e, () => this.recordActivity(), { passive: true }),
    );
  }

  private setupVisibilityListener(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        // App moved to background — start inactivity countdown
        this.resetInactivityTimer();
      } else {
        // App came back to foreground
        if (!this.sessionKey && this.accessToken) {
          // Session expired while in background — start a new one
          this.start(this.accessToken).catch(() => {/* silent */});
        } else {
          this.recordActivity();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupUnloadListener(): void {
    this.unloadHandler = () => {
      this.endSessionRecord(false).catch(() => {/* silent */});
    };
    // pagehide is more reliable on iOS Safari PWA
    window.addEventListener('pagehide',     this.unloadHandler);
    window.addEventListener('beforeunload', this.unloadHandler);
  }
}

export const sessionManager = new SessionManager();
export { detectPlatform };
