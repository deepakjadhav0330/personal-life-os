import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { GlassCard } from '../ui/GlassCard';
import { todayStr } from '../../utils/dates';
import { CheckSquare, Flame, Dumbbell } from 'lucide-react';

export function DailySummaryWidget() {
  const today = todayStr();

  const tasksDone = useLiveQuery(
    () => db.tasks.where({ status: 'completed' }).filter(t => !!t.completedAt?.startsWith(today)).count(),
    [today], 0,
  );
  const tasksPending = useLiveQuery(
    () => db.tasks.where({ status: 'pending' }).filter(t => t.dueDate === today).count(),
    [today], 0,
  );

  const habitsTotal = useLiveQuery(() => db.habits.where({ isActive: 1 as any }).count(), [], 0);
  const habitsDone = useLiveQuery(
    () => db.habitCompletions.where({ date: today }).count(),
    [today], 0,
  );

  const workoutsThisWeek = useLiveQuery(async () => {
    const d = new Date();
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const startStr = start.toISOString().slice(0, 10);
    return db.workouts.where('date').aboveOrEqual(startStr).and(w => w.status === 'completed').count();
  }, [], 0);

  const stats = [
    {
      icon: <CheckSquare size={14} />,
      label: 'Tasks',
      value: `${tasksDone}/${(tasksDone ?? 0) + (tasksPending ?? 0)}`,
      color: '#6366f1',
    },
    {
      icon: <Flame size={14} />,
      label: 'Habits',
      value: `${habitsDone}/${habitsTotal}`,
      color: '#f59e0b',
    },
    {
      icon: <Dumbbell size={14} />,
      label: 'Workouts',
      value: `${workoutsThisWeek} this week`,
      color: '#22c55e',
    },
  ];

  return (
    <GlassCard>
      <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Today at a Glance</p>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="flex flex-col items-center gap-1 p-2 glass-1 rounded-input">
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <span className="text-sm font-bold text-content-primary">{stat.value}</span>
            <span className="text-[10px] text-content-muted">{stat.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
