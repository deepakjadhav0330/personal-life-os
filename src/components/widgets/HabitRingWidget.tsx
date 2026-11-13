import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { GlassCard, ProgressRing } from '../ui';
import { todayStr } from '../../utils/dates';
import { todayCompletionPercent } from '../../utils/habits';
import { Check } from 'lucide-react';

export function HabitRingWidget() {
  const navigate = useNavigate();
  const today = todayStr();

  const habits = useLiveQuery(() => db.habits.filter(h => !!h.isActive).sortBy('order'), [], []);
  const completions = useLiveQuery(
    () => db.habitCompletions.where({ date: today }).toArray(),
    [today], [],
  );

  const pct = todayCompletionPercent(habits ?? [], completions ?? [], today);
  const completedIds = new Set(completions?.map(c => c.habitId) ?? []);

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/habits')}>
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} size={72} strokeWidth={5} sublabel="done" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">Habits Today</p>
          <div className="flex flex-col gap-1.5">
            {(habits ?? []).slice(0, 4).map(h => (
              <div key={h.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: h.color,
                    backgroundColor: completedIds.has(h.id!) ? h.color : 'transparent',
                  }}
                >
                  {completedIds.has(h.id!) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-xs truncate ${completedIds.has(h.id!) ? 'line-through text-content-muted' : 'text-content-secondary'}`}>
                  {h.name}
                </span>
              </div>
            ))}
            {(habits ?? []).length > 4 && (
              <p className="text-xs text-content-muted">+{habits!.length - 4} more</p>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
