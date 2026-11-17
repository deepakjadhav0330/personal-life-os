import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { GlassCard, Button } from '../components/ui';
import { supabase } from '../lib/supabase';
import { AppLogo } from '../components/ui/AppLogo';
import { cn } from '../utils/cn';

const RESEND_COOLDOWN = 60; // seconds

export function OTPVerificationPage() {
  const navigate       = useNavigate();
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const email = sessionStorage.getItem('lifeOS_otp_email') ?? '';

  useEffect(() => {
    // If no email stored, go back to sign-in
    if (!email) navigate('/signin', { replace: true });
    // Auto-focus first box
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function handleDigitChange(index: number, value: string) {
    // Handle paste
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length && i + index < 6; i++) {
        newDigits[index + i] = pasted[i];
      }
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (index + pasted.length >= 6) {
        verifyOTP(newDigits.join(''));
      }
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      verifyOTP(newDigits.join(''));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyOTP(token: string) {
    if (token.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        if (verifyError.message.includes('expired')) {
          setError('Code has expired. Please request a new one.');
        } else if (verifyError.status === 429) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          setError('Invalid code. Please check and try again.');
        }
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Auth state change fires in AuthContext; navigation handled by AuthGate
      sessionStorage.removeItem('lifeOS_otp_email');
      localStorage.removeItem('lifeOS_pending_registration');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendOTP() {
    if (cooldown > 0) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/request-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      setCooldown(RESEND_COOLDOWN);
      setDigits(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Could not resend — check your connection.');
    }
  }

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Enter Your Code</h1>
            <p className="text-sm text-content-muted mt-1">A 6-digit code was sent to</p>
            <p className="text-sm font-medium text-content-secondary">{email}</p>
          </div>
        </div>

        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-4 text-center">
            6-Digit Sign-In Code
          </p>

          {/* OTP digit inputs */}
          <div className="flex justify-center gap-2 mb-4">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className={cn(
                  'w-11 h-13 text-center text-xl font-bold rounded-input glass-input',
                  'text-content-primary transition-all duration-200',
                  'focus:border-accent focus:outline-none',
                  error ? 'border-danger/60' : '',
                )}
                style={{ height: 52 }}
                aria-label={`Digit ${i + 1}`}
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

          {/* Resend */}
          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-xs text-content-muted">Resend in {cooldown}s</p>
            ) : (
              <button
                type="button"
                onClick={resendOTP}
                className="text-xs text-accent hover:text-accent/80 transition-colors underline underline-offset-2"
              >
                Resend code
              </button>
            )}
          </div>
        </GlassCard>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/signin', { replace: true })}
          className="self-center"
        >
          ← Use a different email
        </Button>
      </div>
    </div>
  );
}
