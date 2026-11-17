import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GlassCard, Button, Input } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPrefilledEmail(): string {
  try {
    const reg = JSON.parse(localStorage.getItem('lifeOS_pending_registration') ?? 'null') as { email?: string } | null;
    return reg?.email ?? '';
  } catch { return ''; }
}

export function OTPRequestPage() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const preEmail     = (location.state as { email?: string } | null)?.email ?? getPrefilledEmail();

  const [email, setEmail]     = useState(preEmail);
  const [emailErr, setEmailErr] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr('');
    setApiError('');

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailErr('Enter a valid email address');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // Try direct OTP first (works for all users already in Supabase Auth)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        // User not in Supabase Auth yet — try Edge Function (handles admin first login + approval check)
        const { error: fnError } = await supabase.functions.invoke('request-otp', {
          body: { email: normalizedEmail },
        });

        if (fnError) {
          const msg = (fnError as { message?: string }).message ?? '';
          if (msg.includes('403') || msg.toLowerCase().includes('not yet approved')) {
            setApiError('Your account has not been approved yet.');
          } else if (msg.includes('423') || msg.toLowerCase().includes('suspended')) {
            navigate('/suspended', { replace: true });
          } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
            setApiError('No account found with this email. Please register first.');
          } else {
            setApiError(msg || 'No account found with this email.');
          }
          return;
        }
      }

      // Store email for the verification step
      sessionStorage.setItem('lifeOS_otp_email', normalizedEmail);
      setSent(true);
    } catch {
      setApiError('Unable to connect — check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <AppLogo size={64} />
            <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mt-2">
              <CheckCircle2 size={26} className="text-success" />
            </div>
          </div>

          <GlassCard className="border-success/20 text-center">
            <p className="text-base font-semibold text-content-primary mb-2">
              Check your email
            </p>
            <p className="text-sm text-content-secondary leading-relaxed">
              A sign-in code was sent to
            </p>
            <p className="text-sm font-semibold text-content-primary my-1">{email}</p>
            <p className="text-sm text-content-secondary leading-relaxed">
              Enter the <strong>6-digit code</strong> from the email to sign in.
            </p>
          </GlassCard>

          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('/verify-otp', { replace: true })}
          >
            Enter Code →
          </Button>

          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-xs text-content-muted hover:text-content-secondary transition-colors text-center"
          >
            Resend or use a different email
          </button>
        </div>
      </div>
    );
  }

  // ── Email entry screen ──────────────────────────────────────
  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Sign In</h1>
            <p className="text-sm text-content-muted mt-1">
              We'll send a 6-digit code to your email
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
          className="flex items-center justify-center gap-1.5 text-xs text-content-muted hover:text-content-secondary transition-colors"
        >
          <ArrowLeft size={12} />
          Back to registration
        </button>
      </div>
    </div>
  );
}
