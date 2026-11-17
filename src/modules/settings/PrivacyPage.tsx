import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard } from '../../components/ui';
import { Shield, Database, Wifi, Cloud, Lock, AlertTriangle } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Privacy Information" back />
      <div className="px-4 pb-4 flex flex-col gap-4">

        <GlassCard className="border-success/20">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} className="text-success" />
            <p className="text-sm font-semibold text-success">Your personal records stay on your device</p>
          </div>
          <p className="text-sm text-content-secondary leading-relaxed">
            Life OS is a private, invite-only application. Your personal records (tasks, journal, finances, fitness data) are stored locally and never transmitted to any server. However, feature-usage analytics are collected and visible to the app administrator.
          </p>
        </GlassCard>

        <PrivacySection icon={<Database size={16} />} title="Where is my data stored?">
          Your personal data is stored in IndexedDB, a local database built into your browser. It lives entirely on your device and is included in your iPhone's iCloud device backup if you have iCloud backup enabled for Safari.
        </PrivacySection>

        <PrivacySection icon={<Wifi size={16} />} title="What is transmitted to servers?">
          <strong className="text-warning">Feature usage analytics are transmitted</strong> to the administrator's backend (Supabase). This includes: which modules you open, what feature actions you take (e.g., created a task, logged a workout), session timing, and your account information. Your personal record content is never transmitted.
        </PrivacySection>

        <PrivacySection icon={<Cloud size={16} />} title="Analytics and account data">
          As a condition of access to this private application, the administrator can see your name, email, feature usage activity, session history, and engagement statistics. This data is used to improve the app. The administrator cannot see your tasks, journal entries, financial transactions, or any other personal content.
        </PrivacySection>

        <PrivacySection icon={<Lock size={16} />} title="What we don't collect">
          No advertising. No third-party tracking scripts. No cookies across websites. No personal record content. We collect the minimum information needed to run a private invite-only application.
        </PrivacySection>

        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Data stored on your device</p>
          <div className="flex flex-col gap-2">
            {[
              'Tasks and priorities', 'Habits and streaks', 'Workout sessions and exercises',
              'Body measurements', 'Nutrition logs', 'Financial transactions',
              'Journal entries and reflections', 'Goals and milestones',
              'Calendar reminders', 'Learning progress', 'App settings and preferences',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-content-secondary">
                <span className="text-success text-xs">✓</span>
                {item}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="border-warning/20">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning mb-1">Important: Backup your data</p>
              <p className="text-xs text-content-secondary leading-relaxed">
                If you clear Safari's website data, uninstall the app, or reset your device without an iCloud backup, your data will be permanently lost. We recommend exporting a JSON backup regularly from Settings → Data & Backup.
              </p>
            </div>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}

function PrivacySection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-accent">{icon}</span>
        <p className="text-sm font-semibold text-content-primary">{title}</p>
      </div>
      <p className="text-sm text-content-secondary leading-relaxed">{children}</p>
    </GlassCard>
  );
}
