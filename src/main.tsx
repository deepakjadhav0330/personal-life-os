import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import { AuthProvider } from './auth/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnalyticsProvider } from './analytics/AnalyticsContext.tsx';
import { useAuth } from './auth/AuthContext.tsx';

// ── Service worker version guard ──────────────────────────────
// On every cold open, compare the deployed VITE_APP_VERSION with
// what was last stored in localStorage. If they differ, the app
// was updated — wipe all SW caches, unregister the old worker,
// and reload so the browser fetches fresh code from the network.
// This prevents the "black screen in PWA after deploy" issue on iOS.
(function checkAndClearStaleCache() {
  const DEPLOYED = import.meta.env.VITE_APP_VERSION ?? '1.0.0';
  const STORED   = localStorage.getItem('lifeOS_sw_version');

  if (STORED && STORED !== DEPLOYED) {
    console.log(`[SW] Version changed ${STORED} → ${DEPLOYED}. Clearing caches.`);

    const clear = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      } catch { /* silent */ }
      localStorage.setItem('lifeOS_sw_version', DEPLOYED);
      window.location.reload();
    };

    clear();
    return; // skip rendering — the reload will render with fresh code
  }

  localStorage.setItem('lifeOS_sw_version', DEPLOYED);
})();

function AppWithProviders() {
  const { session, user } = useAuth();
  return (
    <AnalyticsProvider
      accessToken={session?.access_token ?? null}
      userId={user?.id ?? null}
    >
      <App />
    </AnalyticsProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppWithProviders />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
