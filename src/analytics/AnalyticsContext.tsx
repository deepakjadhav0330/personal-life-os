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
  userId: string | null;
}

export function AnalyticsProvider({ children, accessToken, userId }: AnalyticsProviderProps) {
  useEffect(() => {
    // Pass both token AND userId — analytics client uses userId to scope the queue
    analytics.setAccessToken(accessToken, userId);

    if (accessToken && userId) {
      analytics.loadPersistedQueue().catch(() => {/* silent */});
      sessionManager.start(accessToken, userId).catch(() => {/* silent */});
    } else {
      sessionManager.stop();
    }
  }, [accessToken, userId]);

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
