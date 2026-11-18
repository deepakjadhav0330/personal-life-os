import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { GlassCard, Button } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';
import { useInterval } from '../hooks/useInterval';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_found';

function getPendingReg(): { email: string; name: string } | null {
  try {
    return JSON.parse(localStorage.getItem('lifeOS_pending_registration') ?? 'null') as { email: string; name: string } | null;
  } catch {
    return null;
  }
}

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const reg = getPendingReg();
  const [status, setStatus]       = useState<ApprovalStatus>('pending');
  const [checking, setChecking]   = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  async function checkStatus() {
    if (!reg?.email) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-status', {
        method: 'GET',
        headers: { 'x-email': reg.email },
      });
      if (!error && data) {
        const result = data as { status: ApprovalStatus };
        setStatus(result.status);
        setLastChecked(new Date());
        if (result.status === 'rejected') {
          localStorage.removeItem('lifeOS_pending_registration');
        }
      }
    } catch {
      // Network error — keep existing status
    } finally {
      setChecking(false);
    }
  }

  // Poll every 60 seconds
  useInterval(checkStatus, 60_000);

  function startOver() {
    localStorage.removeItem('lifeOS_pending_registration');
    navigate('/', { replace: true });
  }

  if (!reg) {
    // localStorage was cleared — go back to registration
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <h1 className="text-2xl font-bold text-content-primary">Life OS</h1>
        </div>

        {/* Status card */}
        <GlassCard>
          {status === 'pending' && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-14 h-14 rounded-full glass-1 flex items-center justify-center">
                <Clock size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-base font-semibold text-content-primary">Waiting for approval</p>
                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Your request for <span className="text-content-secondary font-medium">{reg.email}</span> is
                  being reviewed. You'll receive an email once approved.
                </p>
              </div>
              <div className="text-xs text-content-dim">
                Last checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw size={13} className={checking ? 'animate-spin' : ''} />}
                onClick={checkStatus}
                disabled={checking}
              >
                {checking ? 'Checking…' : 'Check now'}
              </Button>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <div>
                <p className="text-base font-semibold text-success">You're approved!</p>
                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Your account is ready. Tap below to sign in with a 6-digit code sent to your email.
                </p>
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/signin', { state: { email: reg.email } })}
              >
                Sign In Now →
              </Button>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-14 h-14 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center">
                <XCircle size={24} className="text-danger" />
              </div>
              <div>
                <p className="text-base font-semibold text-danger">Request not approved</p>
                <p className="text-sm text-content-muted mt-1 leading-relaxed">
                  Your access request was not approved at this time.
                </p>
              </div>
              <Button variant="secondary" fullWidth onClick={startOver}>
                Register with a different email
              </Button>
            </div>
          )}
        </GlassCard>

        <button
          type="button"
          onClick={startOver}
          className="text-xs text-content-muted hover:text-content-secondary transition-colors text-center"
        >
          Not you? Start over
        </button>
      </div>
    </div>
  );
}
