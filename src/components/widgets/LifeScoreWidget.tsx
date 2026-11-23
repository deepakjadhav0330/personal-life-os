/**
 * Life Score Widget
 * ─────────────────
 * Composite 0-100 score for this week across five domains.
 * Weights: Habits 25% · Tasks 25% · Finance 20% · Fitness 20% · Learning 10%
 *
 * Scoring principles:
 *  - Habit score uses actual per-habit schedules (daily/weekly/specific days)
 *    via isHabitScheduledOn() — not a blanket "habits × 7 days" assumption.
 *  - Finance uses average budget utilisation when budgets exist. When no
 *    budgets are configured the domain is marked "no data" and excluded from
 *    the composite so users are never penalised for not setting budgets.
 *  - Fitness and Learning use progressive thresholds — 0 is never 0 so a
 *    domain with minimal activity doesn't collapse the entire score.
 *  - Any domain with no data is excluded from the composite and shown with
 *    a "–" label so the user knows it's not contributing.
 *  - The composite is the weighted average of domains that HAVE data, so the
 *    grade reflects actual activity rather than missing information.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  format, startOfWeek, startOfMonth, subDays,
} from 'date-fns';
import { db } from '../../db/database';
import { GlassCard } from '../ui';
import { ArrowRight, Flame, CheckSquare, DollarSign, Dumbbell, GraduationCap } from 'lucide-react';
import { isHabitScheduledOn } from '../../utils/habits';

// ─── Types ────────────────────────────────────────────────────

interface DomainScore {
  id:      string;
  label:   string;
  score:   number;
  weight:  number;
  icon:    React.ReactNode;
  color:   string;
  hasData: boolean; // false = no data, excluded from composite
}

// ─── Grade / colour ───────────────────────────────────────────

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

  const scores = useLiveQuery(async () => {
    const weekStart  = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const today      = format(now, 'yyyy-MM-dd');
    const sevenAgo   = format(subDays(now, 6), 'yyyy-MM-dd');
    const year       = now.getFullYear();
    const month      = now.getMonth() + 1;

    const [
      activeHabits,
      habitCompletions,
      allTasks,
      budgets,
      monthExpenses,
      workoutsThisWeek,
      learningSessions,
    ] = await Promise.all([
      db.habits.filter(h => !!h.isActive).toArray(),
      db.habitCompletions.where('date').between(sevenAgo, today, true, true).toArray(),
      db.tasks.toArray(),
      db.budgets.where('[year+month+category]').between([year, month, 'a'], [year, month, 'z'], true, true).toArray(),
      db.transactions.where('date').between(monthStart, today, true, true).filter(t => t.type === 'expense').toArray(),
      db.workouts.where('date').between(weekStart, today, true, true).filter(w => w.status === 'completed').count(),
      db.learningSessions.where('date').between(sevenAgo, today, true, true).toArray(),
    ]);

    // ── Habits — respect actual per-habit schedule ────────────
    // Walk each of the last 7 days × each active habit and count
    // only the slots where the habit was actually scheduled.
    let habitScheduled = 0;
    let habitCompleted = 0;
    for (let i = 0; i < 7; i++) {
      const day    = subDays(now, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      for (const habit of activeHabits) {
        if (!isHabitScheduledOn(habit, day)) continue;
        habitScheduled++;
        if (habitCompletions.some(c => c.habitId === habit.id && c.date === dayStr)) {
          habitCompleted++;
        }
      }
    }
    const habitScore   = habitScheduled === 0 ? -1  // -1 = no data
      : Math.min(Math.round((habitCompleted / habitScheduled) * 100), 100);

    // ── Tasks ─────────────────────────────────────────────────
    const tasksCompletedThisWeek = allTasks.filter(
      t => t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) >= weekStart,
    ).length;
    const tasksOverdue = allTasks.filter(
      t => t.status === 'pending' && t.dueDate && t.dueDate < today,
    ).length;

    let taskScore: number;
    if (tasksCompletedThisWeek === 0 && tasksOverdue === 0) {
      taskScore = -1; // no task data
    } else {
      const total = tasksCompletedThisWeek + tasksOverdue;
      const base  = Math.round((tasksCompletedThisWeek / Math.max(total, 1)) * 100);
      // Each overdue task beyond the first applies a small penalty (capped)
      taskScore = Math.max(10, Math.min(100, base - Math.min(tasksOverdue * 4, 30)));
    }

    // ── Finance — only when budgets exist ────────────────────
    let financeScore: number;
    if (budgets.length === 0) {
      financeScore = -1; // no budgets = no data
    } else {
      const spendByCat: Record<string, number> = {};
      monthExpenses.forEach(t => { spendByCat[t.category] = (spendByCat[t.category] ?? 0) + t.amount; });
      const avgUtil = budgets.reduce(
        (s, b) => s + (b.limit > 0 ? (spendByCat[b.category] ?? 0) / b.limit : 0),
        0,
      ) / budgets.length;
      financeScore = avgUtil > 1 ? 15 : avgUtil > 0.9 ? 40 : avgUtil > 0.75 ? 65 : avgUtil > 0.5 ? 85 : 95;
    }

    // ── Fitness — 0 workouts still not catastrophic ───────────
    const fitnessScore = workoutsThisWeek === 0 ? 20
      : workoutsThisWeek === 1 ? 50
      : workoutsThisWeek === 2 ? 75
      : 100;

    // ── Learning — lenient thresholds ────────────────────────
    const learningMins = learningSessions.reduce((s, l) => s + l.durationMinutes, 0);
    const learningScore = learningMins === 0
      ? (learningSessions.length > 0 ? 20 : -1)  // no sessions at all = no data
      : learningMins < 30  ? 45
      : learningMins < 60  ? 65
      : learningMins < 120 ? 82
      : 100;

    // ── Composite — weighted average of domains WITH data ────
    const domains: DomainScore[] = [
      { id: 'habits',   label: 'Habits',   score: Math.max(habitScore,   0), weight: 0.25, icon: <Flame         size={11} />, color: '#f59e0b', hasData: habitScore   >= 0 },
      { id: 'tasks',    label: 'Tasks',    score: Math.max(taskScore,    0), weight: 0.25, icon: <CheckSquare   size={11} />, color: '#6366f1', hasData: taskScore    >= 0 },
      { id: 'finance',  label: 'Finance',  score: Math.max(financeScore, 0), weight: 0.20, icon: <DollarSign    size={11} />, color: '#22c55e', hasData: financeScore >= 0 },
      { id: 'fitness',  label: 'Fitness',  score: fitnessScore,              weight: 0.20, icon: <Dumbbell      size={11} />, color: '#ef4444', hasData: true },
      { id: 'learning', label: 'Learning', score: Math.max(learningScore, 0), weight: 0.10, icon: <GraduationCap size={11} />, color: '#3b82f6', hasData: learningScore >= 0 },
    ];

    const dataDomains = domains.filter(d => d.hasData);
    const totalWeight = dataDomains.reduce((s, d) => s + d.weight, 0);
    const composite = totalWeight === 0 ? 0
      : Math.round(dataDomains.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);

    return { composite, domains };
  }, [], null);

  if (!scores) return null;

  const { composite, domains } = scores;
  const grade      = getGrade(composite);
  const scoreColor = getScoreColor(composite);
  const weekLabel  = `Week of ${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')}`;
  const dataDomainCount = domains.filter(d => d.hasData).length;

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
        <div className="text-xl font-black mb-0.5 leading-none" style={{ color: scoreColor }}>
          {grade}
        </div>
        {dataDomainCount < domains.length && (
          <span className="text-[10px] text-content-muted ml-auto mb-1">
            {dataDomainCount}/{domains.length} domains
          </span>
        )}
      </div>

      {/* Domain bars */}
      <div className="flex flex-col gap-1.5">
        {domains.map(d => (
          <div key={d.id} className="flex items-center gap-2">
            <span style={{ color: d.hasData ? d.color : '#404060' }}>{d.icon}</span>
            <span className="text-[11px] text-content-muted w-14 shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              {d.hasData ? (
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${d.score}%`, backgroundColor: d.color }}
                />
              ) : (
                <div className="h-full w-full rounded-full bg-white/[0.03]" />
              )}
            </div>
            <span className="text-[11px] w-8 text-right" style={{ color: d.hasData ? '#a0a0c0' : '#404060' }}>
              {d.hasData ? d.score : '—'}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
