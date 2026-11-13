import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, ChevronRight, X, Check } from 'lucide-react';
import { db } from '../../db/database';
import { BottomSheet, EmptyState } from '../ui';
import { formatDate } from '../../utils/dates';
import type { Nudge } from '../../hooks/useSmartNudges';
import { getDismissed, persistDismiss } from '../../hooks/useSmartNudges';
import { toast } from '../../stores/useToastStore';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  nudges: Nudge[];
}

export function NotificationCenter({ open, onClose, nudges }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  const reminders = useLiveQuery(
    () => db.reminders
      .where('status').equals('pending')
      .sortBy('scheduledAt')
      .then(r => r.slice(0, 10)),
    [],
    [],
  );

  const activeNudges = nudges.filter(n => !dismissed.has(n.id));
  const hasAnything  = activeNudges.length > 0 || (reminders?.length ?? 0) > 0;

  const dismissNudge = (id: string) => {
    persistDismiss(id);
    setDismissed(getDismissed());
  };

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const dismissReminder = async (id: number) => {
    await db.reminders.update(id, { status: 'dismissed' });
    toast.success('Reminder dismissed');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications" snapPoints>
      {!hasAnything ? (
        <EmptyState
          icon={<Check size={24} />}
          title="You're all caught up!"
          subtitle="No alerts or upcoming reminders right now"
          compact
        />
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Smart nudges ──────────────────────────────── */}
          {activeNudges.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">
                Smart Alerts
              </p>
              <div className="flex flex-col gap-2">
                {activeNudges.map(nudge => (
                  <div
                    key={nudge.id}
                    className="flex items-center gap-3 glass-1 rounded-card px-3 py-3 border-l-[3px]"
                    style={{ borderLeftColor: nudge.color }}
                  >
                    <span className="text-lg shrink-0 select-none">{nudge.emoji}</span>

                    <p className="flex-1 text-sm text-content-secondary leading-snug min-w-0">
                      {nudge.message}
                    </p>

                    {nudge.action && (
                      <button
                        onClick={() => goTo(nudge.action!.path)}
                        className="flex items-center gap-0.5 text-xs font-semibold shrink-0"
                        style={{ color: nudge.color }}
                      >
                        {nudge.action.label}
                        <ChevronRight size={12} />
                      </button>
                    )}

                    <button
                      onClick={() => dismissNudge(nudge.id)}
                      aria-label="Dismiss alert"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.06] transition-all shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Upcoming reminders ────────────────────────── */}
          {(reminders?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">
                Upcoming Reminders
              </p>
              <div className="flex flex-col gap-2">
                {reminders?.map(r => (
                  <div key={r.id} className="flex items-center gap-3 glass-1 rounded-card px-3 py-3">
                    <div className="w-8 h-8 rounded-input glass-2 flex items-center justify-center shrink-0">
                      <Bell size={14} className="text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content-primary truncate">{r.title}</p>
                      <p className="text-xs text-content-muted mt-0.5">
                        {formatDate(r.scheduledAt.slice(0, 10))}
                        {r.repeat !== 'once' && ` · ${r.repeat}`}
                      </p>
                    </div>

                    <button
                      onClick={() => dismissReminder(r.id!)}
                      aria-label="Dismiss reminder"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.06] transition-all shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => goTo('/calendar')}
                className="mt-2 w-full text-xs text-content-muted text-center py-2 hover:text-content-secondary transition-colors"
              >
                Manage all reminders →
              </button>
            </div>
          )}

        </div>
      )}
    </BottomSheet>
  );
}
