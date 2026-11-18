import { useState } from 'react';
import { BarChart3, Shield, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { GlassCard, Button } from '../components/ui';
import { AppLogo } from '../components/ui/AppLogo';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export function AnalyticsDisclosurePage() {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleAccept() {
    setLoading(true);
    setError('');
    try {
      // Uses Edge Function with service role — bypasses RLS SELECT-only restriction on profiles
      const { error: fnError } = await supabase.functions.invoke('accept-disclosure', {});
      if (fnError) throw fnError;
      await refreshProfile();
    } catch {
      setError('Could not save preference — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Branding */}
        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo size={64} />
          <div>
            <h1 className="text-xl font-bold text-content-primary">Before You Continue</h1>
            <p className="text-sm text-content-muted mt-1">
              A quick note about data collection in this private app
            </p>
          </div>
        </div>

        {/* What IS tracked */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={15} className="text-accent" />
            <p className="text-xs font-semibold text-content-primary uppercase tracking-wide">
              What the administrator can see
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              'Which modules you open (Tasks, Finance, etc.)',
              'What actions you take (created a task, logged a workout)',
              'When you use the app and your session duration',
              'Your name and email address',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <Eye size={12} className="text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-content-secondary">{item}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* What is NOT tracked */}
        <GlassCard className="border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-success" />
            <p className="text-xs font-semibold text-success uppercase tracking-wide">
              Your personal records are never transmitted
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              'Task names or descriptions',
              'Journal entries or reflections',
              'Transaction amounts or descriptions',
              'Body measurements or weight',
              'Food logs or calorie data',
              'Goal descriptions or notes',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <EyeOff size={12} className="text-success shrink-0 mt-0.5" />
                <p className="text-xs text-content-secondary">{item}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Why */}
        <GlassCard>
          <p className="text-xs text-content-secondary leading-relaxed">
            This is a private, invite-only application. Feature usage analytics help the administrator
            understand how the app is being used and improve it. Analytics are a disclosed condition
            of access.
          </p>
        </GlassCard>

        {error && (
          <p className="text-xs text-danger text-center">{error}</p>
        )}

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          leftIcon={<CheckCircle2 size={15} />}
          onClick={handleAccept}
        >
          I understand — take me to Life OS
        </Button>
      </div>
    </div>
  );
}
