/**
 * habitAutoComplete
 * ─────────────────
 * When the user performs an action (completes a workout, logs water,
 * saves a journal entry, etc.) this utility scans active habits whose
 * names contain relevant keywords and marks them done automatically.
 *
 * Rules:
 *  - Only marks habits that are NOT already completed today
 *  - Only marks habits scheduled for today (respects frequency)
 *  - Silent on error — never disrupts the original action
 *  - Returns the list of matched habit names so callers can toast
 */

import { format } from 'date-fns';
import { db } from '../db/database';
import { isHabitScheduledOn } from './habits';

// ─── Trigger types ────────────────────────────────────────────

export type HabitTrigger =
  | 'workout'      // workout completed
  | 'water'        // water logged
  | 'nutrition'    // food/meal logged
  | 'learning'     // learning session logged
  | 'journal'      // journal entry created
  | 'measurement'; // body measurement logged

// ─── Keyword maps ─────────────────────────────────────────────
// Match against lower-cased habit names using .includes()

const KEYWORDS: Record<HabitTrigger, string[]> = {
  workout: [
    'workout', 'exercise', 'gym', 'training', 'fitness',
    'run', 'running', 'jog', 'jogging', 'swim', 'swimming',
    'lift', 'lifting', 'weights', 'strength', 'cardio',
    'yoga', 'hiit', 'sport', 'active', 'push day', 'pull day',
    'leg day', 'full body', 'crossfit',
  ],
  water: [
    'water', 'hydrat', 'drink', 'h2o', '2l', '3l', 'litre', 'liter',
  ],
  nutrition: [
    'eat', 'eating', 'food', 'nutrition', 'diet', 'meal', 'calorie',
    'macro', 'protein', 'healthy', 'log food', 'track food',
  ],
  learning: [
    'read', 'reading', 'learn', 'learning', 'study', 'studying',
    'book', 'course', 'skill', 'knowledge', 'lesson',
  ],
  journal: [
    'journal', 'journaling', 'write', 'writing', 'diary',
    'reflect', 'reflection', 'gratitude',
  ],
  measurement: [
    'weigh', 'weight', 'measure', 'body', 'scale', 'bmi',
  ],
};

// ─── Core function ────────────────────────────────────────────

/**
 * Scan active habits for keyword matches and mark them done today.
 * @param trigger  Which action fired
 * @param date     YYYY-MM-DD (defaults to today)
 * @returns        Names of habits that were auto-completed
 */
export async function autoCompleteHabits(
  trigger: HabitTrigger,
  date?: string,
): Promise<string[]> {
  const today    = date ?? format(new Date(), 'yyyy-MM-dd');
  const keywords = KEYWORDS[trigger];
  const now      = new Date();

  try {
    const [activeHabits, todayCompletions] = await Promise.all([
      db.habits.filter(h => !!h.isActive).toArray(),
      db.habitCompletions.where({ date: today }).toArray(),
    ]);

    const completedIds = new Set(todayCompletions.map(c => c.habitId));
    const matched:  string[] = [];
    const nowIso = new Date().toISOString();

    for (const habit of activeHabits) {
      if (!habit.id) continue;
      if (completedIds.has(habit.id)) continue;              // already done
      if (!isHabitScheduledOn(habit, now)) continue;         // not today

      const name = habit.name.toLowerCase();
      if (!keywords.some(kw => name.includes(kw))) continue; // no match

      await db.habitCompletions.add({
        habitId:     habit.id,
        date:        today,
        completedAt: nowIso,
      });

      if (navigator.vibrate) navigator.vibrate(10);
      matched.push(habit.name);
    }

    return matched;
  } catch {
    // Never let auto-complete errors surface to the user
    return [];
  }
}
