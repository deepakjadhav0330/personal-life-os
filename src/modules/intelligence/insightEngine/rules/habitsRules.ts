// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Habits Rules
// Pure function: takes data arrays, returns Insight[].
// Reuses calculateStreak and isHabitScheduledOn from utils/habits.
// ─────────────────────────────────────────────────────────────

import { format, parseISO, addDays } from 'date-fns';
import type { Habit, HabitCompletion } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import { hashMetrics, todayISO, thisWeekRange, lastWeekRange } from '../insightUtils';
import { calculateStreak, isHabitScheduledOn } from '../../../../utils/habits';

// ─── Helper: completion rate within an explicit date range ────

function rateInRange(
  completions: HabitCompletion[],
  habit: Habit,
  rangeStart: string,
  rangeEnd: string,
): number {
  const completedSet = new Set(
    completions
      .filter(c => c.date >= rangeStart && c.date <= rangeEnd)
      .map(c => c.date),
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  let scheduled  = 0;
  let completed  = 0;

  let cur = parseISO(rangeStart);
  // Walk from rangeStart to min(rangeEnd, today)
  while (true) {
    const str = format(cur, 'yyyy-MM-dd');
    if (str > rangeEnd || str > todayStr) break;
    if (isHabitScheduledOn(habit, cur)) {
      scheduled++;
      if (completedSet.has(str)) completed++;
    }
    cur = addDays(cur, 1);
  }

  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
}

// ─── Main rule function ───────────────────────────────────────

export function habitsRules(
  habits: Habit[],
  completions: HabitCompletion[],
  weekStartsOn: 0 | 1 = 1,
): Insight[] {
  const insights: Insight[] = [];
  const today    = todayISO();
  const thisWeek = thisWeekRange(weekStartsOn);
  const lastWeek = lastWeekRange(weekStartsOn);

  const active = habits.filter(h => h.isActive);
  if (!active.length) return [];

  // Per-habit insights — cap to avoid flooding
  const strongHabits: Insight[]    = [];
  const strugglingHabits: Insight[] = [];

  for (const habit of active) {
    if (!habit.id) continue;
    const habitCompletions = completions.filter(c => c.habitId === habit.id);

    const thisWeekRate = rateInRange(habitCompletions, habit, thisWeek.start, thisWeek.end);
    const lastWeekRate = rateInRange(habitCompletions, habit, lastWeek.start, lastWeek.end);
    const { current: streak } = calculateStreak(habitCompletions, habit);

    // ── Strong: high completion this week + notable streak
    if (thisWeekRate >= 85 && streak >= 3) {
      strongHabits.push({
        id:               `habits-strong-${habit.id}`,
        category:         'habits',
        title:            `"${habit.name}" is on a strong run`,
        explanation:      `Completed ${thisWeekRate}% of scheduled days this week with a ${streak}-day active streak.`,
        supportingMetric: `${streak}-day streak · ${thisWeekRate}% this week`,
        comparisonPeriod: 'This week',
        severity:         'positive',
        actionPath:       '/habits',
        generatedAt:      today,
        dataHash: hashMetrics({ hid: habit.id, streak, rate: Math.floor(thisWeekRate / 10) * 10, ws: thisWeek.start }),
      });
    }

    // ── Declining: meaningful drop from last week
    if (
      lastWeekRate > 0 &&
      thisWeekRate < lastWeekRate - 25 && // ≥25-point drop
      thisWeekRate < 65
    ) {
      strugglingHabits.push({
        id:               `habits-declining-${habit.id}`,
        category:         'habits',
        title:            `"${habit.name}" consistency dropping`,
        explanation:      `Completion rate dropped from ${lastWeekRate}% last week to ${thisWeekRate}% this week.`,
        supportingMetric: `${lastWeekRate}% → ${thisWeekRate}%`,
        comparisonPeriod: 'This week vs last week',
        severity:         thisWeekRate < 30 ? 'critical' : 'attention',
        recommendedAction: 'Identify what made last week easier and try to replicate it.',
        actionPath:       '/habits',
        generatedAt:      today,
        dataHash: hashMetrics({ hid: habit.id, thisWeekRate, lastWeekRate, ws: thisWeek.start }),
      });
    } else if (thisWeekRate <= 30 && thisWeekRate >= 0) {
      // ── Frequently missed (regardless of last week)
      const alreadyDeclining = strugglingHabits.some(i => i.id === `habits-declining-${habit.id}`);
      if (!alreadyDeclining) {
        strugglingHabits.push({
          id:               `habits-missed-${habit.id}`,
          category:         'habits',
          title:            `"${habit.name}" needs attention`,
          explanation:      `"${habit.name}" has been completed on only ${thisWeekRate}% of scheduled days this week.`,
          supportingMetric: `${thisWeekRate}% completion this week`,
          comparisonPeriod: 'This week',
          severity:         'attention',
          recommendedAction: 'Consider whether this habit still fits your current routine, or simplify it.',
          actionPath:       '/habits',
          generatedAt:      today,
          dataHash: hashMetrics({ hid: habit.id, thisWeekRate, ws: thisWeek.start }),
        });
      }
    }
  }

  // ── Limit outputs: top 2 strong (highest streak first), top 3 struggling (critical first)
  const sortedStrong = strongHabits
    .sort((a, b) => {
      const aStreak = parseInt(a.supportingMetric?.split('-')[0] ?? '0');
      const bStreak = parseInt(b.supportingMetric?.split('-')[0] ?? '0');
      return bStreak - aStreak;
    })
    .slice(0, 2);

  const sortedStruggling = strugglingHabits
    .sort((a, b) => {
      const order = { critical: 0, attention: 1, positive: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 3);

  insights.push(...sortedStrong, ...sortedStruggling);

  // ── Overall weekly summary (only when no per-habit struggles already surface it)
  const totalThisWeekCompletions = completions.filter(
    c => c.date >= thisWeek.start && c.date <= today,
  ).length;

  // Count total scheduled slots across all active habits from week start to today
  let totalScheduled = 0;
  let cur = parseISO(thisWeek.start);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  while (true) {
    const str = format(cur, 'yyyy-MM-dd');
    if (str > today) break;
    for (const h of active) {
      if (isHabitScheduledOn(h, cur)) totalScheduled++;
    }
    cur = addDays(cur, 1);
  }

  const overallRate = totalScheduled > 0
    ? Math.round((totalThisWeekCompletions / totalScheduled) * 100)
    : 0;

  if (totalScheduled >= 3) { // enough data for a meaningful summary
    if (overallRate >= 80 && sortedStruggling.length === 0) {
      insights.push({
        id:               'habits-overall-week',
        category:         'habits',
        title:            'Strong habit week',
        explanation:      `You've completed ${overallRate}% of scheduled habits so far this week — well above average.`,
        supportingMetric: `${overallRate}% completion rate`,
        comparisonPeriod: 'This week to date',
        severity:         'positive',
        actionPath:       '/habits',
        generatedAt:      today,
        dataHash: hashMetrics({ rate: Math.floor(overallRate / 10) * 10, ws: thisWeek.start }),
      });
    } else if (overallRate < 50 && sortedStruggling.length === 0) {
      insights.push({
        id:               'habits-overall-week',
        category:         'habits',
        title:            'Habit consistency is low this week',
        explanation:      `Only ${overallRate}% of scheduled habits completed so far this week.`,
        supportingMetric: `${overallRate}% completion rate`,
        comparisonPeriod: 'This week to date',
        severity:         'attention',
        recommendedAction: 'Review your habits list — fewer, well-chosen habits build consistency faster.',
        actionPath:       '/habits',
        generatedAt:      today,
        dataHash: hashMetrics({ rate: Math.floor(overallRate / 10) * 10, ws: thisWeek.start }),
      });
    }
  }

  return insights;
}
