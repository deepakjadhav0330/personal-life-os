// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — ChatGPT Summary Builder
// Builds aggregated, privacy-safe text summaries per category.
// Never includes: email, user IDs, tokens, raw transactions,
// merchant names, journal entries, or raw database records.
// ─────────────────────────────────────────────────────────────

import { format } from 'date-fns';
import type {
  Transaction, Budget, Habit, HabitCompletion,
  Workout, BodyMeasurement, NutritionLog,
  Goal, Milestone, Task, LearningItem, LearningSession,
} from '../../../../db/schema';
import { capitalize, formatCurrency, formatMinutes } from '../../../../utils/format';
import { currentMTD, getPreviousCompleteMonths, historicalMTDEnd, thisWeekRange, lastWeekRange } from '../insightUtils';

export type ChatGPTCategory = 'finance' | 'fitness' | 'habits' | 'goals' | 'tasks' | 'learning';

export interface CategorySummary {
  category: ChatGPTCategory;
  text: string;
}

// ─── Finance ─────────────────────────────────────────────────

export function buildFinanceSummary(
  transactions: Transaction[],
  budgets: Budget[],
  currency: string,
): string {
  const today    = format(new Date(), 'yyyy-MM-dd');
  const mtd      = currentMTD();
  const prevMonths = getPreviousCompleteMonths(3);
  const expenses = transactions.filter(t => t.type === 'expense');
  const income   = transactions.filter(t => t.type === 'income');

  const totalExpenses = expenses
    .filter(t => t.date >= mtd.start && t.date <= today)
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = income
    .filter(t => t.date >= mtd.start && t.date <= today)
    .reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const catTotals: Record<string, number> = {};
  expenses
    .filter(t => t.date >= mtd.start && t.date <= today)
    .forEach(t => { catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount; });

  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, amt]) => `${capitalize(cat)} ${formatCurrency(amt, currency)}`)
    .join(', ');

  // Budget utilisation
  const budgetLines = budgets
    .map(b => {
      const spent = expenses
        .filter(t => t.category === b.category && t.date >= mtd.start && t.date <= today)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return `${capitalize(b.category)} ${pct}% of ${formatCurrency(b.limit, currency)}`;
    })
    .join(', ');

  // Historical average (previous 3 months)
  const histTotals = prevMonths.map(m => {
    const histEnd = historicalMTDEnd(m.year, m.month, mtd.dayOfMonth);
    return expenses
      .filter(t => t.date >= m.start && t.date <= histEnd)
      .reduce((s, t) => s + t.amount, 0);
  }).filter(v => v > 0);

  const histAvg = histTotals.length > 0
    ? Math.round(histTotals.reduce((s, v) => s + v, 0) / histTotals.length)
    : null;

  let lines = [
    `Period: ${mtd.monthKey} (${mtd.dayOfMonth} days elapsed, ${mtd.daysRemaining} remaining)`,
    `Total spending this month: ${formatCurrency(totalExpenses, currency)}`,
  ];
  if (totalIncome > 0) lines.push(`Income recorded: ${formatCurrency(totalIncome, currency)}`);
  if (topCats) lines.push(`Top categories: ${topCats}`);
  if (budgetLines) lines.push(`Budget utilisation: ${budgetLines}`);
  if (histAvg !== null) lines.push(`3-month MTD average spending (day 1–${mtd.dayOfMonth}): ${formatCurrency(histAvg, currency)}`);

  return lines.join('\n');
}

// ─── Habits ──────────────────────────────────────────────────

export function buildHabitsSummary(
  habits: Habit[],
  completions: HabitCompletion[],
  weekStartsOn: 0 | 1,
): string {
  const thisWeek = thisWeekRange(weekStartsOn);
  const lastWeek = lastWeekRange(weekStartsOn);
  const today    = format(new Date(), 'yyyy-MM-dd');

  const active = habits.filter(h => h.isActive);
  if (!active.length) return 'No active habits configured.';

  const doneThisWeek = completions.filter(c => c.date >= thisWeek.start && c.date <= today).length;
  const doneLastWeek = completions.filter(c => c.date >= lastWeek.start && c.date <= lastWeek.end).length;

  // Simple overall rate (completions / active habits × days elapsed this week)
  const daysElapsed = Math.max(1,
    Math.round((new Date().getTime() - new Date(thisWeek.start + 'T00:00:00').getTime()) / 86400000) + 1,
  );
  const maxPossible = active.length * daysElapsed;
  const rate        = maxPossible > 0 ? Math.round((doneThisWeek / maxPossible) * 100) : 0;
  const lastRate    = active.length * 7 > 0
    ? Math.round((doneLastWeek / (active.length * 7)) * 100)
    : 0;

  return [
    `Active habits: ${active.length}`,
    `Completion this week: ${rate}% (last week: ${lastRate}%)`,
    `Completions recorded this week: ${doneThisWeek}`,
  ].join('\n');
}

// ─── Goals ───────────────────────────────────────────────────

export function buildGoalsSummary(goals: Goal[], milestones: Milestone[]): string {
  const today   = format(new Date(), 'yyyy-MM-dd');
  const active  = goals.filter(g => g.status === 'active');
  const paused  = goals.filter(g => g.status === 'paused');

  const overdue = milestones.filter(
    m => m.status !== 'completed' && m.targetDate && m.targetDate < today,
  );

  const stalled = active.filter(g => {
    const updated = g.updatedAt ?? g.createdAt;
    const days    = Math.floor(
      (new Date().getTime() - new Date(updated).getTime()) / 86400000,
    );
    return days >= 14;
  });

  return [
    `Active goals: ${active.length}`,
    paused.length > 0 ? `Paused goals: ${paused.length}` : null,
    overdue.length > 0 ? `Overdue milestones: ${overdue.length}` : null,
    stalled.length > 0 ? `Goals with no update in 14+ days: ${stalled.length}` : null,
  ].filter(Boolean).join('\n');
}

// ─── Tasks ───────────────────────────────────────────────────

export function buildTasksSummary(tasks: Task[]): string {
  const today    = format(new Date(), 'yyyy-MM-dd');
  const thisWeek = thisWeekRange(1);
  const overdue  = tasks.filter(t => t.status === 'pending' && t.dueDate && t.dueDate < today);
  const doneThisWeek = tasks.filter(
    t => t.completedAt && t.completedAt.slice(0, 10) >= thisWeek.start,
  );

  const lines = [
    `Overdue tasks: ${overdue.length}`,
    `  — High priority: ${overdue.filter(t => t.priority === 'high').length}`,
    `Completed this week: ${doneThisWeek.length}`,
    `Pending tasks (total): ${tasks.filter(t => t.status === 'pending').length}`,
  ];

  return lines.join('\n');
}

// ─── Fitness ─────────────────────────────────────────────────

export function buildFitnessSummary(
  workouts: Workout[],
  bodyMeasurements: BodyMeasurement[],
  nutritionLogs: NutritionLog[],
): string {
  const thisWeek = thisWeekRange(1);
  const lastWeek = lastWeekRange(1);
  const today    = format(new Date(), 'yyyy-MM-dd');

  const thisWeekCount = workouts.filter(w => w.date >= thisWeek.start && w.date <= today).length;
  const lastWeekCount = workouts.filter(w => w.date >= lastWeek.start && w.date <= lastWeek.end).length;

  const weightMeasurements = bodyMeasurements.filter(m => m.type === 'weight').slice(0, 2);
  const weightTrend = weightMeasurements.length >= 2
    ? (() => {
        const delta = weightMeasurements[0].value - weightMeasurements[1].value;
        return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${weightMeasurements[0].unit} (last 2 measurements)`;
      })()
    : null;

  const start = new Date(); start.setDate(start.getDate() - 6);
  const startStr = start.toISOString().slice(0, 10);
  const daysLogged = nutritionLogs.filter(log => {
    if (log.date < startStr || log.date > today) return false;
    return log.meals.flatMap(m => m.foods).reduce((s, f) => s + f.calories, 0) > 0;
  }).length;

  return [
    `Workouts this week: ${thisWeekCount}`,
    lastWeekCount > 0 ? `Workouts last week: ${lastWeekCount}` : null,
    weightTrend ? `Weight trend: ${weightTrend}` : null,
    `Nutrition days logged (last 7 days): ${daysLogged}/7`,
  ].filter(Boolean).join('\n');
}

// ─── Learning ────────────────────────────────────────────────

export function buildLearningSummary(
  items: LearningItem[],
  sessions: LearningSession[],
): string {
  const thisWeek = thisWeekRange(1);
  const lastWeek = lastWeekRange(1);
  const today    = format(new Date(), 'yyyy-MM-dd');

  const active = items.filter(i => i.status === 'active' || i.status === 'paused');
  const minsThisWeek = sessions.filter(s => s.date >= thisWeek.start && s.date <= today)
    .reduce((s, l) => s + l.durationMinutes, 0);
  const minsLastWeek = sessions.filter(s => s.date >= lastWeek.start && s.date <= lastWeek.end)
    .reduce((s, l) => s + l.durationMinutes, 0);

  return [
    `Active learning items: ${active.length}`,
    sessions.length > 0 ? `Time this week: ${formatMinutes(minsThisWeek)}` : null,
    sessions.length > 0 && minsLastWeek > 0 ? `Time last week: ${formatMinutes(minsLastWeek)}` : null,
    `Completed items (all time): ${items.filter(i => i.status === 'completed').length}`,
  ].filter(Boolean).join('\n');
}

// ─── Orchestrator ─────────────────────────────────────────────

export interface AllDataForSummary {
  transactions:     Transaction[];
  budgets:          Budget[];
  currency:         string;
  habits:           Habit[];
  habitCompletions: HabitCompletion[];
  weekStartsOn:     0 | 1;
  goals:            Goal[];
  milestones:       Milestone[];
  tasks:            Task[];
  workouts:         Workout[];
  bodyMeasurements: BodyMeasurement[];
  nutritionLogs:    NutritionLog[];
  learningItems:    LearningItem[];
  learningSessions: LearningSession[];
  weightUnit:       'kg' | 'lbs';
}

export function buildCategorySummaries(
  selected: ChatGPTCategory[],
  data: AllDataForSummary,
): CategorySummary[] {
  return selected
    .map(cat => {
      let text: string;
      switch (cat) {
        case 'finance':
          text = buildFinanceSummary(data.transactions, data.budgets, data.currency);
          break;
        case 'habits':
          text = buildHabitsSummary(data.habits, data.habitCompletions, data.weekStartsOn);
          break;
        case 'goals':
          text = buildGoalsSummary(data.goals, data.milestones);
          break;
        case 'tasks':
          text = buildTasksSummary(data.tasks);
          break;
        case 'fitness':
          text = buildFitnessSummary(data.workouts, data.bodyMeasurements, data.nutritionLogs);
          break;
        case 'learning':
          text = buildLearningSummary(data.learningItems, data.learningSessions);
          break;
        default:
          text = '';
      }
      return { category: cat, text } satisfies CategorySummary;
    })
    .filter(s => s.text.length > 0);
}
