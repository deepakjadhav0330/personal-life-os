import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { RegistrationPage } from './RegistrationPage';
import { PendingApprovalPage } from './PendingApprovalPage';
import { SuspendedPage } from './SuspendedPage';
import { AnalyticsDisclosurePage } from './AnalyticsDisclosurePage';
import { Spinner } from '../components/ui';
import { useAnalytics } from '../analytics/AnalyticsContext';
import { detectPlatform } from '../analytics/sessionManager';

// Auth-only routes that should redirect to app if already signed in
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

function getPendingReg(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem('lifeOS_pending_registration') ?? 'null') as { email?: string } | null;
    return v?.email ?? null;
  } catch {
    return null;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, session, profile, user } = useAuth();
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

  // Fire app_opened once when the user becomes authenticated + approved
  useEffect(() => {
    if (!isLoading && session && profile?.status === 'approved') {
      track('app_opened', {
        platform:    detectPlatform(),
        app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, !!session, profile?.status]);

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) return <FullScreenSpinner />;

  // ── No session ─────────────────────────────────────────────
  if (!session) {
    const pendingEmail = getPendingReg();
    if (pendingEmail) return <PendingApprovalPage />;
    return <RegistrationPage />;
  }

  // ── Session exists, but no profile yet ────────────────────
  if (!profile) {
    // Profile is still fetching — show spinner, don't sign out
    return <FullScreenSpinner />;
  }

  // ── Suspended ──────────────────────────────────────────────
  if (profile.status === 'suspended') return <SuspendedPage />;

  // ── Pending — edge case where session exists but not yet approved ──
  if (profile.status === 'pending') return <PendingApprovalPage />;

  // ── First-time login — analytics disclosure ─────────────────
  if (!profile.has_seen_disclosure && !user?.app_metadata?.['role']) {
    // Admin bypasses disclosure (they set up the system)
    return <AnalyticsDisclosurePage />;
  }

  // ── Fully authenticated + approved ─────────────────────────
  return <>{children}</>;
}
