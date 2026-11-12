import type { Habit, HabitCompletion } from '../db/schema';
import { format, subDays, getDay } from 'date-fns';

export interface StreakResult {
  current: number;
  longest: number;
}

/** True if a habit is scheduled for a given date */
export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'specific_days' && habit.targetDays) {
    return habit.targetDays.includes(getDay(date));
  }
  return true; // weekly — always eligible, controller handles weekly counts
}

/** Calculate current and longest streaks for a habit */
export function calculateStreak(completions: HabitCompletion[], habit: Habit): StreakResult {
  if (!completions.length) return { current: 0, longest: 0 };

  const sorted = [...completions].sort((a, b) => b.date.localeCompare(a.date));
  const completedDates = new Set(sorted.map(c => c.date));

  let current = 0;
  let longest = 0;
  let streak = 0;
  const today = new Date();

  // Walk backward from today
  for (let i = 0; i <= 365; i++) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');

    if (!isHabitScheduledOn(habit, d)) continue;

    if (completedDates.has(dateStr)) {
      streak++;
      if (i === 0 || current > 0 || streak === 1) {
        current = streak;
      }
      longest = Math.max(longest, streak);
    } else {
      if (i === 0) {
        // Not completed today yet — still OK to continue streak from yesterday
        continue;
      }
      if (streak > 0) {
        longest = Math.max(longest, streak);
        if (i === 1 && current === 0) {
          // Gap started today — streak broken
          current = 0;
        }
        streak = 0;
      }
    }
  }

  return { current, longest };
}

/** Completion percentage for a date range */
export function completionRate(
  completions: HabitCompletion[],
  habit: Habit,
  days: number,
): number {
  const completedSet = new Set(completions.map(c => c.date));
  let scheduled = 0;
  let completed = 0;
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = subDays(today, i);
    if (!isHabitScheduledOn(habit, d)) continue;
    scheduled++;
    if (completedSet.has(format(d, 'yyyy-MM-dd'))) completed++;
  }

  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

/** Today's completion percentage across all habits */
export function todayCompletionPercent(
  habits: Habit[],
  completions: HabitCompletion[],
  todayStr: string,
): number {
  const active = habits.filter(h => h.isActive);
  if (!active.length) return 0;
  const completedToday = completions.filter(c => c.date === todayStr).map(c => c.habitId);
  const completedSet = new Set(completedToday);
  const done = active.filter(h => h.id && completedSet.has(h.id)).length;
  return Math.round((done / active.length) * 100);
}
