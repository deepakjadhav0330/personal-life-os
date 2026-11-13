import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { GlassCard, EmptyState } from '../ui';
import { formatDateRelative } from '../../utils/dates';
import { Bell } from 'lucide-react';

export function RemindersWidget() {
  const navigate = useNavigate();

  const reminders = useLiveQuery(
    () => db.reminders
      .where('status').equals('pending')
      .sortBy('scheduledAt')
      .then(r => r.slice(0, 3)),
    [],
    [],
  );

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/calendar')}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">Upcoming Reminders</p>
      </div>

      {!reminders?.length ? (
        <EmptyState icon={<Bell size={20} />} title="No upcoming reminders" compact />
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map(r => {
            const dateStr = r.scheduledAt.slice(0, 10);
            return (
              <div key={r.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-input glass-1 flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content-primary truncate">{r.title}</p>
                  <p className="text-xs text-content-muted">{formatDateRelative(dateStr)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
