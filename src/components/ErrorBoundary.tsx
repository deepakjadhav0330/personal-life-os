import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Store in localStorage so it survives a reload and can be read in Safari
    try {
      localStorage.setItem('lifeOS_last_error', JSON.stringify({
        message: error.message,
        stack:   error.stack?.slice(0, 1000),
        componentStack: info.componentStack?.slice(0, 500),
        at: new Date().toISOString(),
      }));
    } catch { /* silent */ }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#06060f',
        color: '#f0f0ff',
        fontFamily: 'system-ui, sans-serif',
        gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: 16, textAlign: 'center' }}>
          Something went wrong
        </p>
        <p style={{
          fontSize: 12, color: '#888', textAlign: 'center',
          maxWidth: 320, wordBreak: 'break-word',
        }}>
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '10px 24px',
            background: '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 14, cursor: 'pointer',
          }}
        >
          Reload App
        </button>
        <button
          onClick={() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
              }
              caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
            } catch { /* silent */ }
            window.location.reload();
          }}
          style={{
            padding: '8px 20px', background: 'transparent', color: '#888',
            border: '1px solid #333', borderRadius: 10, fontSize: 12, cursor: 'pointer',
          }}
        >
          Clear data &amp; reload
        </button>
      </div>
    );
  }
}
