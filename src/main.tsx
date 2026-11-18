import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import { AuthProvider } from './auth/AuthContext.tsx';
import { AnalyticsProvider } from './analytics/AnalyticsContext.tsx';
import { useAuth } from './auth/AuthContext.tsx';

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
    <AuthProvider>
      <AppWithProviders />
    </AuthProvider>
  </React.StrictMode>,
);
