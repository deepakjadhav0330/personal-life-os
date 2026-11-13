import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { GlassCard } from '../ui';
import { todayStr } from '../../utils/dates';
import { useSetting } from '../../hooks/useSetting';
import { formatCurrency } from '../../utils/format';
import { Utensils, Wallet, Target, BookOpen } from 'lucide-react';

export function QuickStatsWidget() {
  const navigate = useNavigate();
  const today = todayStr();
  const [currency] = useSetting('currency', 'INR');
  const [calorieTarget] = useSetting('calorieTarget', 2200);

  const todayNutrition = useLiveQuery(
    () => db.nutritionLogs.where('date').equals(today).first(),
    [today],
  );
  const todayCalories = todayNutrition?.meals.flatMap(m => m.foods).reduce((sum, f) => sum + f.calories, 0) ?? 0;

  const todaySpending = useLiveQuery(async () => {
    const txns = await db.transactions.where('date').equals(today).filter(t => t.type === 'expense').toArray();
    return txns.reduce((sum, t) => sum + t.amount, 0);
  }, [today], 0);

  const activeGoals = useLiveQuery(() => db.goals.where('status').equals('active').count(), [], 0);

  const learningHoursThisWeek = useLiveQuery(async () => {
    const d = new Date();
    const start = new Date(d); start.setDate(d.getDate() - 7);
    const startStr = start.toISOString().slice(0, 10);
    const sessions = await db.learningSessions.where('date').aboveOrEqual(startStr).toArray();
    return Math.round(sessions.reduce((s, l) => s + l.durationMinutes, 0) / 60 * 10) / 10;
  }, [], 0);

  const stats = [
    {
      icon: <Utensils size={16} />,
      label: 'Calories',
      value: `${Math.round(todayCalories)}`,
      sub: `/${calorieTarget} kcal`,
      color: '#f59e0b',
      path: '/fitness',
    },
    {
      icon: <Wallet size={16} />,
      label: 'Spent today',
      value: formatCurrency(todaySpending ?? 0, currency),
      color: '#22c55e',
      path: '/finance',
    },
    {
      icon: <Target size={16} />,
      label: 'Active goals',
      value: `${activeGoals}`,
      color: '#8b5cf6',
      path: '/goals',
    },
    {
      icon: <BookOpen size={16} />,
      label: 'Learning',
      value: `${learningHoursThisWeek}h`,
      sub: 'this week',
      color: '#3b82f6',
      path: '/learning',
    },
  ];

  return (
    <GlassCard>
      <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Quick Stats</p>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(stat => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="flex items-center gap-3 p-3 glass-1 rounded-input hover:glass-2 transition-all duration-200 text-left"
          >
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-content-primary truncate">
                {stat.value}<span className="text-[10px] font-normal text-content-muted">{stat.sub}</span>
              </p>
              <p className="text-[10px] text-content-muted">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
