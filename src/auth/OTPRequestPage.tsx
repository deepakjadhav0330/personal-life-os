import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle } from 'lucide-react';
import { GlassCard, Button, Input } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPrefilledEmail(): string {
  // Priority: navigation state → pending registration localStorage
  try {
    const reg = JSON.parse(localStorage.getItem('lifeOS_pending_registration') ?? 'null') as { email: string } | null;
    return reg?.email ?? '';
  } catch {
    return '';
  }
}

export function OTPRequestPage() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const preEmail     = (location.state as { email?: string } | null)?.email ?? getPrefilledEmail();

  const [email, setEmail]       = useState(preEmail);
  const [emailErr, setEmailErr] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr('');
    setApiError('');

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailErr('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke('request-otp', {
        body: { email: email.trim().toLowerCase() },
      });

      if (fnError) {
        const msg = (fnError as { message?: string; context?: { json?: () => Promise<{ error?: string }> } }).message ?? '';
        if (msg.includes('403') || msg.toLowerCase().includes('not yet approved')) {
          setApiError('Your account has not been approved yet. Please wait for the administrator to review your request.');
        } else if (msg.includes('423') || msg.toLowerCase().includes('suspended')) {
          navigate('/suspended', { replace: true });
        } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          setApiError("No account found with this email. Did you register?");
        } else {
          setApiError(msg || 'Something went wrong. Please try again.');
        }
        return;
      }

      // Store email for the OTP verification step
      sessionStorage.setItem('lifeOS_otp_email', email.trim().toLowerCase());
      navigate('/verify-otp', { replace: true });
    } catch {
      setApiError('Unable to connect — check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Sign In</h1>
            <p className="text-sm text-content-muted mt-1">
              Enter your email to receive a sign-in code
            </p>
          </div>
        </div>

        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-4">
            Email Sign-In
          </p>

          <form onSubmit={handleSend} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
              error={emailErr}
              autoComplete="email"
              leftElement={<Mail size={15} />}
              disabled={loading}
            />

            {apiError && (
              <div className="flex items-start gap-2 glass-1 rounded-input px-3 py-2.5 border border-danger/30">
                <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-danger leading-relaxed">{apiError}</p>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Send Sign-In Code
            </Button>
          </form>
        </GlassCard>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('lifeOS_pending_registration');
            navigate('/', { replace: true });
          }}
          className="text-xs text-content-muted hover:text-content-secondary transition-colors text-center"
        >
          ← Back to registration
        </button>
      </div>
    </div>
  );
}
