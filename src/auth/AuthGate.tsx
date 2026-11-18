import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, LogOut, WifiOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { RegistrationPage } from './RegistrationPage';
import { PendingApprovalPage } from './PendingApprovalPage';
import { SuspendedPage } from './SuspendedPage';
import { AnalyticsDisclosurePage } from './AnalyticsDisclosurePage';
import { Spinner, Button, GlassCard } from '../components/ui';
import { useAnalytics } from '../analytics/AnalyticsContext';
import { detectPlatform } from '../analytics/sessionManager';

const AUTH_ROUTES = ['/signin', '/verify-otp', '/pending'];

function FullScreenSpinner() {
  return (
    <div className="min-h-screen-dvh flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-accent" />
        <p className="text-sm text-content-muted">Loading…</p>
      </div>
    </div>
  );
}

function ProfileErrorScreen({ isTimeout, onRetry, onSignOut }: {
  isTimeout: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center">
            <WifiOff size={24} className="text-warning" />
          </div>
          <div>
            <p className="text-base font-semibold text-content-primary">
              {isTimeout ? 'Connection problem' : 'Account not found'}
            </p>
            <p className="text-sm text-content-muted mt-1 leading-relaxed">
              {isTimeout
                ? 'Could not load your profile. Check your connection and try again.'
                : 'Your account profile could not be found. Please sign out and contact the administrator.'}
            </p>
          </div>
        </div>

        <GlassCard className="flex flex-col gap-3">
          {isTimeout && (
            <Button variant="primary" fullWidth leftIcon={<RefreshCw size={14} />} onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button variant="ghost" fullWidth leftIcon={<LogOut size={14} />} onClick={onSignOut}>
            Sign Out
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}

function getPendingReg(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem('lifeOS_pending_registration') ?? 'null') as { email?: string } | null;
    return v?.email ?? null;
  } catch { return null; }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, session, profile, user, profileError, signOut, refreshProfile } = useAuth();
  const { track } = useAnalytics();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Redirect authenticated + approved users away from auth-only screens
  useEffect(() => {
    if (!isLoading && session && profile?.status === 'approved' && profile.has_seen_disclosure) {
      if (AUTH_ROUTES.some(r => location.pathname.startsWith(r))) {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, session, profile, location.pathname, navigate]);

  // Fire app_opened once when authenticated + approved
  useEffect(() => {
    if (!isLoading && session && profile?.status === 'approved') {
      track('app_opened', {
        platform:    detectPlatform(),
        app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, !!session, profile?.status]);

  if (isLoading) return <FullScreenSpinner />;

  if (!session) {
    const pendingEmail = getPendingReg();
    if (pendingEmail) return <PendingApprovalPage />;
    return <RegistrationPage />;
  }

  if (!profile) {
    // profileError tells us why the profile is missing
    if (profileError) {
      return (
        <ProfileErrorScreen
          isTimeout={profileError === 'timeout'}
          onRetry={refreshProfile}
          onSignOut={signOut}
        />
      );
    }
    // Profile still loading (no error yet — keep spinner)
    return <FullScreenSpinner />;
  }

  if (profile.status === 'suspended') return <SuspendedPage />;
  if (profile.status === 'pending')   return <PendingApprovalPage />;

  if (!profile.has_seen_disclosure && !user?.app_metadata?.['role']) {
    return <AnalyticsDisclosurePage />;
  }

  return <>{children}</>;
}
