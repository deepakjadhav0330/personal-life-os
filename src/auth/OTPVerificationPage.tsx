import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { GlassCard, Button } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

const CODE_LENGTH  = 6;
const RESEND_WAIT  = 60; // seconds

export function OTPVerificationPage() {
  const navigate       = useNavigate();
  const [digits, setDigits]     = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const email = sessionStorage.getItem('lifeOS_otp_email') ?? '';

  useEffect(() => {
    if (!email) { navigate('/signin', { replace: true }); return; }
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function handleChange(index: number, value: string) {
    // Handle paste
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
      const next   = [...digits];
      for (let i = 0; i < pasted.length; i++) next[index + i] = pasted[i];
      setDigits(next);
      const focus = Math.min(index + pasted.length, CODE_LENGTH - 1);
      inputRefs.current[focus]?.focus();
      if (pasted.length === CODE_LENGTH) verifyCode(next.join(''));
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (digit && index === CODE_LENGTH - 1) verifyCode(next.join(''));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyCode(code: string) {
    if (code.length !== CODE_LENGTH) return;
    setLoading(true);
    setError('');

    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (err) {
        if (err.message.toLowerCase().includes('expired')) {
          setError('Code has expired — request a new one.');
        } else if (err.status === 429) {
          setError('Too many attempts — please wait a moment.');
        } else {
          setError('Invalid code — please check and try again.');
        }
        setDigits(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      // Session established — AuthGate handles navigation
      sessionStorage.removeItem('lifeOS_otp_email');
      localStorage.removeItem('lifeOS_pending_registration');
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      setCooldown(RESEND_WAIT);
      setDigits(Array(CODE_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Could not resend — check your connection.');
    }
  }

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Enter Code</h1>
            <p className="text-sm text-content-muted mt-1">6-digit code sent to</p>
            <p className="text-sm font-semibold text-content-secondary">{email}</p>
          </div>
        </div>

        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-4 text-center">
            Sign-In Code
          </p>

          {/* Code input boxes */}
          <div className="flex justify-center gap-2 mb-4">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                aria-label={`Digit ${i + 1}`}
                className={cn(
                  'w-11 text-center text-xl font-bold rounded-input glass-input',
                  'text-content-primary transition-all duration-200',
                  'focus:border-accent focus:outline-none',
                  error ? 'border-danger/60' : '',
                )}
                style={{ height: 52 }}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 glass-1 rounded-input px-3 py-2.5 border border-danger/30 mb-3">
              <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {loading && (
            <p className="text-xs text-content-muted text-center mb-3">Verifying…</p>
          )}

          <div className="text-center">
            {cooldown > 0
              ? <p className="text-xs text-content-muted">Resend in {cooldown}s</p>
              : <button type="button" onClick={resend} className="text-xs text-accent hover:text-accent/80 transition-colors underline underline-offset-2">
                  Resend code
                </button>
            }
          </div>
        </GlassCard>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={13} />}
          onClick={() => navigate('/signin', { replace: true })}
          className="self-center"
        >
          Use a different email
        </Button>
      </div>
    </div>
  );
}
