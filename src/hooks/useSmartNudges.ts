/**
 * useSmartNudges
 * ──────────────
 * Computes contextual, time-aware nudges from local IndexedDB data.
 * No external service, no push notifications — just smart analysis
 * of data the user has already entered.
 *
 * Nudge checks (all computed locally):
 *   1. Late habits      — after 9pm, habits still unchecked today
 *   2. Streak warning   — from 6pm, habit with 3+ day streak not done today
 *   3. Budget alert     — category spending ≥ 80% of its monthly budget
 *   4. Overdue tasks    — pending tasks overdue by more than 2 days
 *   5. Goal deadline    — active goal due within 7 days
 *   6. No food logged   — after 2pm with zero calories logged today
 *
 * Dismissed nudges are stored in sessionStorage so they reappear
 * the next time the app is opened, but not in the same session.
 */
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { calculateStreak } from '../utils/habits';
import { format, subDays, addDays, parseISO, differenceInDays } from 'date-fns';
import { capitalize } from '../utils/format';

// ─── Types ────────────────────────────────────────────────────

export interface Nudge {
  id: string;
  message: string;
  emoji: string;
  color: string;
  priority: 1 | 2 | 3;   // 1 = urgent, 2 = warning, 3 = info
  action?: { label: string; path: string };
}

// ─── Session-based dismiss storage ──────────────────────────
const DISMISSED_KEY = `life_os_dismissed_${format(new Date(), 'yyyy-MM-dd')}`;

export function getDismissed(): Set<string> {
  try {
    const v = sessionStorage.getItem(DISMISSED_KEY);
    return new Set(v ? JSON.parse(v) : []);
  } catch { return new Set(); }
}

export function persistDismiss(id: string): void {
  try {
    const d = getDismissed();
    d.add(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...d]));
  } catch { /* sessionStorage blocked */ }
}

// ─── Core computation (async, runs outside React render) ─────

async function computeNudges(): Promise<Nudge[]> {
  const nudges: Nudge[] = [];
  const now   = new Date();
  const hour  = now.getHours();
  const today = format(now, 'yyyy-MM-dd');
  const twoDaysAgo      = format(subDays(now, 2), 'yyyy-MM-dd');
  const sevenDaysOut    = format(addDays(now, 7), 'yyyy-MM-dd');
  const monthStart      = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd        = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
  const year            = now.getFullYear();
  const month           = now.getMonth() + 1;

  try {
    // ── 1. Streak protection (from 6pm) ───────────────────
    if (hour >= 18) {
      const habits = await db.habits.filter(h => !!h.isActive).toArray();
      const todayCompletions = await db.habitCompletions.where('date').equals(today).toArray();
      const doneToday = new Set(todayCompletions.map(c => c.habitId));

      for (const habit of habits) {
        if (doneToday.has(habit.id!)) continue;
        const completions = await db.habitCompletions
          .where('habitId').equals(habit.id!)
          .toArray();
        const { current } = calculateStreak(completions, habit);
        if (current >= 3) {
          nudges.push({
            id: `streak-${habit.id}`,
            message: `Your ${current}-day "${habit.name}" streak resets at midnight`,
            emoji: '🔥',
            color: '#f97316',
            priority: 1,
            action: { label: 'Mark done', path: '/habits' },
          });
          break; // Only show one streak warning at a time
        }
      }
    }

    // ── 2. Late habits (from 9pm) ──────────────────────────
    if (hour >= 21) {
      const habits = await db.habits.filter(h => !!h.isActive).toArray();
      const doneSet = new Set(
        (await db.habitCompletions.where('date').equals(today).toArray()).map(c => c.habitId),
      );
      const remaining = habits.filter(h => !doneSet.has(h.id!));
      if (remaining.length > 0) {
        nudges.push({
          id: 'late-habits',
          message: `${remaining.length} habit${remaining.length > 1 ? 's' : ''} still unchecked today`,
          emoji: '✅',
          color: '#f59e0b',
          priority: 1,
          action: { label: 'View habits', path: '/habits' },
        });
      }
    }

    // ── 3. Budget alert (≥80% spent) ──────────────────────
    const budgets = await db.budgets
      .where('[year+month+category]')
      .between([year, month, 'a'], [year, month, 'z'], true, true)
      .toArray();

    for (const budget of budgets) {
      const txns = await db.transactions
        .where('category').equals(budget.category)
        .filter(t =>
          t.type === 'expense' &&
          t.date >= monthStart &&
          t.date <= monthEnd,
        )
        .toArray();
      const spent = txns.reduce((s, t) => s + t.amount, 0);
      const pct = Math.round((spent / budget.limit) * 100);

      if (pct >= 100) {
        nudges.push({
          id: `budget-over-${budget.category}`,
          message: `${capitalize(budget.category)} budget exceeded (${pct}% used)`,
          emoji: '🚨',
          color: '#ef4444',
          priority: 1,
          action: { label: 'View finance', path: '/finance' },
        });
      } else if (pct >= 80) {
        nudges.push({
          id: `budget-warn-${budget.category}`,
          message: `${capitalize(budget.category)} budget is ${pct}% used this month`,
          emoji: '⚠️',
          color: '#f59e0b',
          priority: 2,
          action: { label: 'View finance', path: '/finance' },
        });
      }
    }

    // ── 4. Overdue tasks (>2 days late) ───────────────────
    const overdue = await db.tasks
      .where('status').equals('pending')
      .filter(t => !!t.dueDate && t.dueDate < twoDaysAgo)
      .count();
    if (overdue > 0) {
      nudges.push({
        id: 'overdue-tasks',
        message: `${overdue} task${overdue > 1 ? 's are' : ' is'} more than 2 days overdue`,
        emoji: '⏰',
        color: '#ef4444',
        priority: 2,
        action: { label: 'Review tasks', path: '/tasks' },
      });
    }

    // ── 5. Goal deadline approaching (≤7 days) ────────────
    const nearDeadlineGoals = await db.goals
      .where('status').equals('active')
      .filter(g =>
        !!g.targetDate &&
        g.targetDate >= today &&
        g.targetDate <= sevenDaysOut,
      )
      .toArray();

    if (nearDeadlineGoals.length > 0) {
      // Sort by nearest deadline
      nearDeadlineGoals.sort((a, b) =>
        (a.targetDate ?? '').localeCompare(b.targetDate ?? ''),
      );
      const goal = nearDeadlineGoals[0];
      const daysLeft = differenceInDays(parseISO(goal.targetDate!), now);
      nudges.push({
        id: `goal-deadline-${goal.id}`,
        message: daysLeft === 0
          ? `"${goal.title}" deadline is today`
          : `"${goal.title}" deadline in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        emoji: '🎯',
        color: '#22c55e',
        priority: 2,
        action: { label: 'View goal', path: '/goals' },
      });
    }

    // ── 6. No food logged after 2pm ───────────────────────
    if (hour >= 14) {
      const log = await db.nutritionLogs.where('date').equals(today).first();
      const totalCal = log?.meals
        .flatMap(m => m.foods)
        .reduce((s, f) => s + f.calories, 0) ?? 0;
      if (totalCal === 0) {
        nudges.push({
          id: 'no-food',
          message: "You haven't logged any food today",
          emoji: '🥗',
          color: '#06b6d4',
          priority: 3,
          action: { label: 'Log food', path: '/fitness' },
        });
      }
    }

  } catch (err) {
    console.warn('[nudges]', err);
  }

  // Sort by priority (1 first), then stable by id
  return nudges.sort((a, b) => a.priority - b.priority);
}

// ─── React hook ───────────────────────────────────────────────

export function useSmartNudges(): Nudge[] {
  const [nudges, setNudges] = useState<Nudge[]>([]);

  const refresh = useCallback(async () => {
    const all = await computeNudges();
    setNudges(all);
  }, []);

  useEffect(() => {
    refresh();

    // Re-check every 5 minutes (time-based nudges change with the hour)
    const interval = setInterval(refresh, 5 * 60 * 1000);

    // Re-check immediately when the user returns to the app
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return nudges;
}
