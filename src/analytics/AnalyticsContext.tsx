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
    // Flush when connection is restored after being offline
    const onOnline = () => { analytics.flush().catch(() => {/* silent */}); };
    window.addEventListener('online', onOnline);

    // Flush when the user switches tabs or minimises — covers the case where
    // the user adds data and closes the tab before the 2-second debounce fires.
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        analytics.flush().catch(() => {/* silent */});
      }
    };
    document.addEventListener('visibilitychange', onHide);

    // pagehide fires on mobile browsers when the page is unloaded / backgrounded
    const onPageHide = () => { analytics.flush().catch(() => {/* silent */}); };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
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
