import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, X, Sparkles } from 'lucide-react';
import { db } from '../../db/database';
import { BottomSheet } from '../ui';
import { formatDate } from '../../utils/dates';
import type { Nudge } from '../../hooks/useSmartNudges';
import { getDismissed, persistDismiss } from '../../hooks/useSmartNudges';
import { toast } from '../../stores/useToastStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface NotificationCenterProps {
  nudges: Nudge[];
}

// ── Map nudge type/id to a readable category label ───────────
function nudgeCategoryLabel(id: string): string {
  if (id.startsWith('streak'))      return 'Streak at risk';
  if (id.startsWith('late-habits')) return 'Habits';
  if (id.startsWith('budget-over')) return 'Budget exceeded';
  if (id.startsWith('budget-warn')) return 'Budget warning';
  if (id.startsWith('overdue'))     return 'Overdue tasks';
  if (id.startsWith('goal'))        return 'Goal deadline';
  if (id === 'no-food')             return 'Nutrition';
  return 'Alert';
}

// ── Individual nudge card ─────────────────────────────────────
function NudgeCard({
  nudge,
  onDismiss,
  onAction,
}: {
  nudge: Nudge;
  onDismiss: () => void;
  onAction: (path: string) => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden glass-2 animate-fade-in"
      style={{ boxShadow: `0 4px 20px ${nudge.color}18` }}
    >
      {/* ── Coloured header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: `${nudge.color}14`,
          borderBottom: `1px solid ${nudge.color}22`,
        }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px] select-none"
          style={{ background: `${nudge.color}22` }}
        >
          {nudge.emoji}
        </div>

        {/* Category label */}
        <p
          className="flex-1 text-xs font-bold uppercase tracking-widest"
          style={{ color: nudge.color }}
        >
          {nudgeCategoryLabel(nudge.id)}
        </p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="w-8 h-8 flex items-center justify-center rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.08] transition-all shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Message body ── */}
      <div className="px-4 py-3">
        <p className="text-sm text-content-primary leading-relaxed">
          {nudge.message}
        </p>
      </div>

      {/* ── Action button ── */}
      {nudge.action && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onAction(nudge.action!.path)}
            className="w-full py-2.5 rounded-input text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{
              background: `${nudge.color}1a`,
              color: nudge.color,
              border: `1px solid ${nudge.color}35`,
              borderTopColor: `${nudge.color}55`,
            }}
          >
            {nudge.action.label} →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reminder card ─────────────────────────────────────────────
function ReminderCard({
  reminder,
  onDismiss,
}: {
  reminder: { id?: number; title: string; scheduledAt: string; repeat: string };
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 glass-1 rounded-xl px-4 py-3.5">
      {/* Bell icon */}
      <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0">
        <Bell size={15} className="text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-content-primary truncate">
          {reminder.title}
        </p>
        <p className="text-xs text-content-muted mt-0.5">
          {formatDate(reminder.scheduledAt.slice(0, 10))}
          {reminder.repeat !== 'once' && (
            <span className="ml-1.5 text-accent/80">· {reminder.repeat}</span>
          )}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss reminder"
        className="w-8 h-8 flex items-center justify-center rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.08] transition-all shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest">
        {label}
      </p>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

// ── All-clear state ───────────────────────────────────────────
function AllClearState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-1"
        style={{
          background: 'linear-gradient(135deg, rgba(139,71,255,0.15), rgba(99,102,241,0.08))',
          border: '1px solid rgba(139,71,255,0.2)',
          borderTopColor: 'rgba(139,71,255,0.35)',
        }}
      >
        <Sparkles size={32} className="text-accent opacity-80" />
      </div>
      <div>
        <p className="text-lg font-bold text-content-primary">All clear</p>
        <p className="text-sm text-content-secondary mt-1">
          No alerts or reminders right now
        </p>
      </div>
      <p className="text-xs text-content-muted mt-1 max-w-[200px] leading-relaxed">
        Smart alerts will appear here when something needs your attention.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function NotificationCenter({ nudges }: NotificationCenterProps) {
  const { isOpen, close } = useNotificationStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  const reminders = useLiveQuery(
    () => db.reminders
      .where('status').equals('pending')
      .sortBy('scheduledAt')
      .then(r => r.slice(0, 8)),
    [],
    [],
  );

  const activeNudges   = nudges.filter(n => !dismissed.has(n.id));
  const hasNudges      = activeNudges.length > 0;
  const hasReminders   = (reminders?.length ?? 0) > 0;
  const totalCount     = activeNudges.length + (reminders?.length ?? 0);

  const dismissNudge = (id: string) => {
    persistDismiss(id);
    setDismissed(getDismissed());
  };

  const dismissReminder = async (id: number) => {
    await db.reminders.update(id, { status: 'dismissed' });
    toast.success('Reminder dismissed');
  };

  const goTo = (path: string) => {
    navigate(path);
    close();
  };

  // Dynamic title: show count when there's something to see
  const title = totalCount > 0 ? `Inbox  ·  ${totalCount}` : 'Inbox';

  return (
    <BottomSheet open={isOpen} onClose={close} title={title} snapPoints>

      {!hasNudges && !hasReminders ? (
        <AllClearState />
      ) : (
        <div className="flex flex-col gap-3">

          {/* ── Smart alerts ──────────────────────────────── */}
          {hasNudges && (
            <>
              {hasReminders && <SectionDivider label="Smart Alerts" />}
              {activeNudges.map(nudge => (
                <NudgeCard
                  key={nudge.id}
                  nudge={nudge}
                  onDismiss={() => dismissNudge(nudge.id)}
                  onAction={goTo}
                />
              ))}
            </>
          )}

          {/* ── Reminders ─────────────────────────────────── */}
          {hasReminders && (
            <>
              {hasNudges && <SectionDivider label="Reminders" />}
              {reminders?.map(r => (
                <ReminderCard
                  key={r.id}
                  reminder={r as any}
                  onDismiss={() => r.id && dismissReminder(r.id)}
                />
              ))}

              <button
                onClick={() => goTo('/calendar')}
                className="w-full text-xs text-content-muted text-center py-3 hover:text-content-secondary transition-colors"
              >
                Manage all reminders →
              </button>
            </>
          )}

        </div>
      )}
    </BottomSheet>
  );
}
