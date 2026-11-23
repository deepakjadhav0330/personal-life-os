/**
 * Life Score Widget
 * Composite 0-100 score based on this week's performance across
 * Habits (25%), Tasks (25%), Finance (20%), Fitness (20%), Learning (10%).
 * All calculations are local — no external services.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  format, startOfWeek, startOfMonth, subDays,
} from 'date-fns';
import { db } from '../../db/database';
import { GlassCard } from '../ui';
import { ArrowRight, Flame, CheckSquare, DollarSign, Dumbbell, GraduationCap } from 'lucide-react';

// ─── Score computation ────────────────────────────────────────

interface DomainScore {
  id:    string;
  label: string;
  score: number;
  icon:  React.ReactNode;
  color: string;
}

function computeScores(d: {
  activeHabits:        number;
  habitCompletions:    number;
  tasksCompleted:      number;
  tasksOverdue:        number;
  avgBudgetUtil:       number | null;
  workoutsThisWeek:    number;
  learningMinsWeek:    number;
}): { composite: number; domains: DomainScore[] } {
  // Habits (25%) — completion rate over 7 days vs all active habits
  const habitScore = d.activeHabits === 0 ? 60
    : Math.min(Math.round((d.habitCompletions / (d.activeHabits * 7)) * 100), 100);

  // Tasks (25%) — penalise overdue, reward completed
  const taskBase  = d.tasksCompleted > 0 || d.tasksOverdue > 0
    ? Math.round((d.tasksCompleted / Math.max(d.tasksCompleted + d.tasksOverdue, 1)) * 100)
    : 70;
  const taskScore = Math.max(10, Math.min(100, taskBase - d.tasksOverdue * 4));

  // Finance (20%) — based on average budget utilisation this month
  const financeScore = d.avgBudgetUtil === null ? 70
    : d.avgBudgetUtil > 1    ? 15
    : d.avgBudgetUtil > 0.9  ? 40
    : d.avgBudgetUtil > 0.75 ? 65
    : d.avgBudgetUtil > 0.5  ? 85
    : 95;

  // Fitness (20%) — 3 workouts/week = 100
  const fitnessScore = Math.min(d.workoutsThisWeek * 34, 100);

  // Learning (10%) — 60 min/week = 100
  const learningScore = d.learningMinsWeek === 0 ? 20
    : d.learningMinsWeek < 30  ? 40
    : d.learningMinsWeek < 60  ? 60
    : d.learningMinsWeek < 120 ? 80
    : 100;

  const composite = Math.round(
    habitScore   * 0.25 +
    taskScore    * 0.25 +
    financeScore * 0.20 +
    fitnessScore * 0.20 +
    learningScore * 0.10,
  );

  return {
    composite,
    domains: [
      { id: 'habits',   label: 'Habits',   score: habitScore,    icon: <Flame         size={11} />, color: '#f59e0b' },
      { id: 'tasks',    label: 'Tasks',    score: taskScore,     icon: <CheckSquare   size={11} />, color: '#6366f1' },
      { id: 'finance',  label: 'Finance',  score: financeScore,  icon: <DollarSign    size={11} />, color: '#22c55e' },
      { id: 'fitness',  label: 'Fitness',  score: fitnessScore,  icon: <Dumbbell      size={11} />, color: '#ef4444' },
      { id: 'learning', label: 'Learning', score: learningScore, icon: <GraduationCap size={11} />, color: '#3b82f6' },
    ],
  };
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

// ─── Widget ───────────────────────────────────────────────────

export function LifeScoreWidget() {
  const navigate = useNavigate();
  const now = new Date();

  const data = useLiveQuery(async () => {
    const weekStart   = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart  = format(startOfMonth(now), 'yyyy-MM-dd');
    const today       = format(now, 'yyyy-MM-dd');
    const sevenAgo    = format(subDays(now, 6), 'yyyy-MM-dd');
    const year        = now.getFullYear();
    const month       = now.getMonth() + 1;

    const [
      activeHabits,
      habitCompletions,
      allTasks,
      budgets,
      monthExpenses,
      workoutsThisWeek,
      learningSessions,
    ] = await Promise.all([
      db.habits.filter(h => !!h.isActive).count(),
      db.habitCompletions.where('date').between(sevenAgo, today, true, true).count(),
      db.tasks.toArray(),
      db.budgets.where('[year+month+category]').between([year, month, 'a'], [year, month, 'z'], true, true).toArray(),
      db.transactions.where('date').between(monthStart, today, true, true).filter(t => t.type === 'expense').toArray(),
      db.workouts.where('date').between(weekStart, today, true, true).filter(w => w.status === 'completed').count(),
      db.learningSessions.where('date').between(sevenAgo, today, true, true).toArray(),
    ]);

    const tasksCompleted = allTasks.filter(
      t => t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) >= weekStart,
    ).length;
    const tasksOverdue = allTasks.filter(
      t => t.status === 'pending' && t.dueDate && t.dueDate < today,
    ).length;

    let avgBudgetUtil: number | null = null;
    if (budgets.length > 0) {
      const spendByCat: Record<string, number> = {};
      monthExpenses.forEach(t => { spendByCat[t.category] = (spendByCat[t.category] ?? 0) + t.amount; });
      avgBudgetUtil = budgets.reduce(
        (s, b) => s + (b.limit > 0 ? (spendByCat[b.category] ?? 0) / b.limit : 0),
        0,
      ) / budgets.length;
    }

    const learningMinsWeek = learningSessions.reduce((s, l) => s + l.durationMinutes, 0);

    return { activeHabits, habitCompletions, tasksCompleted, tasksOverdue, avgBudgetUtil, workoutsThisWeek, learningMinsWeek };
  }, [], null);

  if (!data) return null; // loading

  const { composite, domains } = computeScores(data);
  const grade      = getGrade(composite);
  const scoreColor = getScoreColor(composite);
  const weekLabel  = `Week of ${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')}`;

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/review')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">Life Score</p>
        <div className="flex items-center gap-1 text-content-muted">
          <span className="text-[10px]">{weekLabel}</span>
          <ArrowRight size={11} />
        </div>
      </div>

      {/* Score + grade */}
      <div className="flex items-end gap-3 mb-3">
        <div>
          <span className="text-4xl font-black" style={{ color: scoreColor }}>{composite}</span>
          <span className="text-sm text-content-muted">/100</span>
        </div>
        <div
          className="text-xl font-black mb-0.5 leading-none"
          style={{ color: scoreColor }}
        >
          {grade}
        </div>
      </div>

      {/* Domain bars */}
      <div className="flex flex-col gap-1.5">
        {domains.map(d => (
          <div key={d.id} className="flex items-center gap-2">
            <span style={{ color: d.color }}>{d.icon}</span>
            <span className="text-[11px] text-content-muted w-14 shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${d.score}%`, backgroundColor: d.color }}
              />
            </div>
            <span className="text-[11px] text-content-muted w-8 text-right">{d.score}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
