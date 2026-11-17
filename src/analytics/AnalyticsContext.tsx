import { createContext, useContext, useEffect } from 'react';
import { analytics } from './analyticsClient';
import { sessionManager } from './sessionManager';
import type { EventName, EventProperties } from './events';

interface AnalyticsContextValue {
  track: (name: EventName, props?: EventProperties) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  children: React.ReactNode;
  accessToken: string | null;
}

export function AnalyticsProvider({ children, accessToken }: AnalyticsProviderProps) {
  // Keep analytics client in sync with current access token
  useEffect(() => {
    analytics.setAccessToken(accessToken);

    if (accessToken) {
      // Load any events that were queued while offline
      analytics.loadPersistedQueue().catch(() => {/* silent */});
      // Start or resume the session
      sessionManager.start(accessToken).catch(() => {/* silent */});
    } else {
      // Signed out — stop session tracking
      sessionManager.stop();
    }
  }, [accessToken]);

  // Flush queued events when the browser comes back online
  useEffect(() => {
    const handler = () => { analytics.flush().catch(() => {/* silent */}); };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, []);

  const track = (name: EventName, props?: EventProperties) => {
    analytics.track(name, props ?? {});
  };

  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return ctx;
}
