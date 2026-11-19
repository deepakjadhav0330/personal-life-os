// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Data Selectors
// Thin async wrappers over db.* for the insight engine.
// No logic, no calculations — only data retrieval.
// ─────────────────────────────────────────────────────────────

import { format, startOfMonth, subMonths } from 'date-fns';
import { db } from '../../../db/database';

// ─── Finance ─────────────────────────────────────────────────

/**
 * Fetch all transactions spanning the current month plus
 * the last `historicalMonths` complete months.
 */
export async function fetchTransactions(historicalMonths = 3) {
  const now        = new Date();
  const rangeStart = format(startOfMonth(subMonths(now, historicalMonths)), 'yyyy-MM-dd');
  const rangeEnd   = format(now, 'yyyy-MM-dd');
  return db.transactions
    .where('date')
    .between(rangeStart, rangeEnd, true, true)
    .toArray();
}

/** Fetch all budgets for the current year/month only. */
export async function fetchCurrentBudgets() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  return db.budgets
    .where('[year+month+category]')
    .between([year, month, 'a'], [year, month, 'z'], true, true)
    .toArray();
}

// ─── Habits ──────────────────────────────────────────────────

export async function fetchActiveHabits() {
  return db.habits.filter(h => !!h.isActive).toArray();
}

/** Fetch completions for the last `daysBack` days. */
export async function fetchHabitCompletions(daysBack = 21) {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return db.habitCompletions
    .where('date')
    .aboveOrEqual(format(start, 'yyyy-MM-dd'))
    .toArray();
}

// ─── Goals ───────────────────────────────────────────────────

export async function fetchActiveGoals() {
  return db.goals.where('status').anyOf(['active', 'paused']).toArray();
}

export async function fetchAllMilestones() {
  return db.milestones.toArray();
}

// ─── Tasks ───────────────────────────────────────────────────

export async function fetchAllTasks() {
  return db.tasks.toArray();
}

// ─── Fitness ─────────────────────────────────────────────────

/** Completed workouts for the last `weeksBack` weeks. */
export async function fetchRecentWorkouts(weeksBack = 4) {
  const start = new Date();
  start.setDate(start.getDate() - weeksBack * 7);
  return db.workouts
    .where('date')
    .aboveOrEqual(format(start, 'yyyy-MM-dd'))
    .filter(w => w.status === 'completed')
    .toArray();
}

/** All body measurements, most recent first. */
export async function fetchBodyMeasurements() {
  return db.bodyMeasurements.orderBy('date').reverse().toArray();
}

/** Nutrition logs for the last `daysBack` days. */
export async function fetchNutritionLogs(daysBack = 14) {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return db.nutritionLogs
    .where('date')
    .aboveOrEqual(format(start, 'yyyy-MM-dd'))
    .toArray();
}

// ─── Learning ────────────────────────────────────────────────

export async function fetchLearningItems() {
  return db.learningItems.toArray();
}

/** Learning sessions for the last `weeksBack` weeks. */
export async function fetchLearningSessions(weeksBack = 4) {
  const start = new Date();
  start.setDate(start.getDate() - weeksBack * 7);
  return db.learningSessions
    .where('date')
    .aboveOrEqual(format(start, 'yyyy-MM-dd'))
    .toArray();
}
