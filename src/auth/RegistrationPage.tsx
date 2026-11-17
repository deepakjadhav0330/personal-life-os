import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, AlertCircle } from 'lucide-react';
import { GlassCard, Button, Input } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegistrationPage() {
  const navigate     = useNavigate();
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [nameErr, setNameErr]   = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  function validate(): boolean {
    let ok = true;
    setNameErr('');
    setEmailErr('');
    if (!name.trim()) { setNameErr('Full name is required'); ok = false; }
    else if (name.trim().length > 100) { setNameErr('Name must be under 100 characters'); ok = false; }
    if (!email.trim()) { setEmailErr('Email address is required'); ok = false; }
    else if (!EMAIL_RE.test(email.trim())) { setEmailErr('Enter a valid email address'); ok = false; }
    else if (email.length > 254) { setEmailErr('Email is too long'); ok = false; }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');

    try {
      const { error: fnError } = await supabase.functions.invoke('create-access-request', {
        body: { full_name: name.trim(), email: email.trim().toLowerCase() },
      });

      if (fnError) {
        const msg = (fnError as { message?: string }).message ?? '';
        if (msg.includes('409') || msg.toLowerCase().includes('already')) {
          setApiError('An account with this email is already registered or pending approval.');
        } else if (msg.includes('429')) {
          setApiError('Too many requests — please wait a minute and try again.');
        } else {
          setApiError(msg || 'Something went wrong. Please try again.');
        }
        return;
      }

      // Store pending state so AuthGate shows PendingApprovalPage on reload
      localStorage.setItem(
        'lifeOS_pending_registration',
        JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
      );
      navigate('/pending', { replace: true });
    } catch {
      setApiError('Unable to connect — check your internet connection and try again.');
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
            <h1 className="text-2xl font-bold text-content-primary">Life OS</h1>
            <p className="text-sm text-content-muted mt-1">
              Request access to your personal command centre
            </p>
          </div>
        </div>

        {/* Form */}
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-4">
            Request Access
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Full Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(''); }}
              error={nameErr}
              autoComplete="name"
              leftElement={<User size={15} />}
              disabled={loading}
            />

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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              Request Access
            </Button>
          </form>
        </GlassCard>

        {/* Already approved */}
        <div className="text-center">
          <span className="text-sm text-content-muted">Already approved? </span>
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className={cn(
              'text-sm text-accent font-medium underline underline-offset-2',
              'hover:text-accent/80 transition-colors',
            )}
          >
            Sign in →
          </button>
        </div>
      </div>
    </div>
  );
}
