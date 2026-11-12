import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  Setting, Task, Habit, HabitCompletion,
  Workout, WorkoutSet, Exercise, BodyMeasurement,
  NutritionLog, FoodItem, Transaction, Budget,
  JournalEntry, Goal, Milestone, Reminder,
  LearningItem, LearningSession,
} from './schema';

class PersonalLifeOSDatabase extends Dexie {
  settings!: Table<Setting>;
  tasks!: Table<Task>;
  habits!: Table<Habit>;
  habitCompletions!: Table<HabitCompletion>;
  workouts!: Table<Workout>;
  workoutSets!: Table<WorkoutSet>;
  exercises!: Table<Exercise>;
  bodyMeasurements!: Table<BodyMeasurement>;
  nutritionLogs!: Table<NutritionLog>;
  foodItems!: Table<FoodItem>;
  transactions!: Table<Transaction>;
  budgets!: Table<Budget>;
  journalEntries!: Table<JournalEntry>;
  goals!: Table<Goal>;
  milestones!: Table<Milestone>;
  reminders!: Table<Reminder>;
  learningItems!: Table<LearningItem>;
  learningSessions!: Table<LearningSession>;

  constructor() {
    super('PersonalLifeOS');

    this.version(1).stores({
      settings:          '++id, &key',
      tasks:             '++id, dueDate, priority, category, status, createdAt',
      habits:            '++id, frequency, category, isActive, order',
      habitCompletions:  '++id, [habitId+date], habitId, date',
      workouts:          '++id, date, type, status',
      workoutSets:       '++id, workoutId, exerciseId',
      exercises:         '++id, primaryMuscle, equipment, type, isCustom',
      bodyMeasurements:  '++id, date, type',
      nutritionLogs:     '++id, &date',
      foodItems:         '++id, name, category',
      transactions:      '++id, date, type, category, paymentMethod',
      budgets:           '++id, [year+month+category], year, month',
      journalEntries:    '++id, date, mood, type',
      goals:             '++id, category, status, targetDate',
      milestones:        '++id, goalId, targetDate, status, order',
      reminders:         '++id, scheduledAt, type, status',
      learningItems:     '++id, type, status',
      learningSessions:  '++id, learningItemId, date',
    });
  }
}

export const db = new PersonalLifeOSDatabase();

// ─── Convenience helpers ──────────────────────────────────────
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.where('key').equals(key).first();
  if (!row) return defaultValue;
  try { return JSON.parse(row.value) as T; } catch { return defaultValue; }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const row = await db.settings.where('key').equals(key).first();
  const now = new Date().toISOString();
  if (row?.id) {
    await db.settings.update(row.id, { value: JSON.stringify(value), updatedAt: now });
  } else {
    await db.settings.add({ key, value: JSON.stringify(value), updatedAt: now });
  }
}

// ─── Full export (for backup) ────────────────────────────────
export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const [
    settings, tasks, habits, habitCompletions, workouts, workoutSets,
    exercises, bodyMeasurements, nutritionLogs, foodItems, transactions,
    budgets, journalEntries, goals, milestones, reminders, learningItems, learningSessions,
  ] = await Promise.all([
    db.settings.toArray(),
    db.tasks.toArray(),
    db.habits.toArray(),
    db.habitCompletions.toArray(),
    db.workouts.toArray(),
    db.workoutSets.toArray(),
    db.exercises.where('isCustom').equals(1).toArray(), // only export custom exercises
    db.bodyMeasurements.toArray(),
    db.nutritionLogs.toArray(),
    db.foodItems.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
    db.journalEntries.toArray(),
    db.goals.toArray(),
    db.milestones.toArray(),
    db.reminders.toArray(),
    db.learningItems.toArray(),
    db.learningSessions.toArray(),
  ]);

  return {
    settings, tasks, habits, habitCompletions, workouts, workoutSets,
    exercises, bodyMeasurements, nutritionLogs, foodItems, transactions,
    budgets, journalEntries, goals, milestones, reminders, learningItems, learningSessions,
  };
}

// ─── Full import (for restore) ───────────────────────────────
export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  await db.transaction('rw', [
    db.settings, db.tasks, db.habits, db.habitCompletions, db.workouts,
    db.workoutSets, db.bodyMeasurements, db.nutritionLogs, db.foodItems,
    db.transactions, db.budgets, db.journalEntries, db.goals, db.milestones,
    db.reminders, db.learningItems, db.learningSessions,
  ], async () => {
    // Clear all user tables (keep seeded exercises)
    await Promise.all([
      db.settings.clear(), db.tasks.clear(), db.habits.clear(),
      db.habitCompletions.clear(), db.workouts.clear(), db.workoutSets.clear(),
      db.bodyMeasurements.clear(), db.nutritionLogs.clear(), db.foodItems.clear(),
      db.transactions.clear(), db.budgets.clear(), db.journalEntries.clear(),
      db.goals.clear(), db.milestones.clear(), db.reminders.clear(),
      db.learningItems.clear(), db.learningSessions.clear(),
    ]);

    // Re-import
    if (data.settings?.length) await db.settings.bulkAdd(data.settings as Setting[]);
    if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks as Task[]);
    if (data.habits?.length) await db.habits.bulkAdd(data.habits as Habit[]);
    if (data.habitCompletions?.length) await db.habitCompletions.bulkAdd(data.habitCompletions as HabitCompletion[]);
    if (data.workouts?.length) await db.workouts.bulkAdd(data.workouts as Workout[]);
    if (data.workoutSets?.length) await db.workoutSets.bulkAdd(data.workoutSets as WorkoutSet[]);
    if (data.bodyMeasurements?.length) await db.bodyMeasurements.bulkAdd(data.bodyMeasurements as BodyMeasurement[]);
    if (data.nutritionLogs?.length) await db.nutritionLogs.bulkAdd(data.nutritionLogs as NutritionLog[]);
    if (data.foodItems?.length) await db.foodItems.bulkAdd(data.foodItems as FoodItem[]);
    if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions as Transaction[]);
    if (data.budgets?.length) await db.budgets.bulkAdd(data.budgets as Budget[]);
    if (data.journalEntries?.length) await db.journalEntries.bulkAdd(data.journalEntries as JournalEntry[]);
    if (data.goals?.length) await db.goals.bulkAdd(data.goals as Goal[]);
    if (data.milestones?.length) await db.milestones.bulkAdd(data.milestones as Milestone[]);
    if (data.reminders?.length) await db.reminders.bulkAdd(data.reminders as Reminder[]);
    if (data.learningItems?.length) await db.learningItems.bulkAdd(data.learningItems as LearningItem[]);
    if (data.learningSessions?.length) await db.learningSessions.bulkAdd(data.learningSessions as LearningSession[]);

    // Re-import custom exercises
    if (data.exercises?.length) {
      const custom = (data.exercises as Exercise[]).filter(e => e.isCustom);
      if (custom.length) await db.exercises.bulkAdd(custom);
    }
  });
}

// ─── Validate import structure ────────────────────────────────
export function validateBackupStructure(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid file format' };
  const d = data as Record<string, unknown>;
  if (!d.appVersion || !d.exportedAt || !d.data) return { valid: false, error: 'Missing required fields' };
  const inner = d.data as Record<string, unknown>;
  const required = ['tasks', 'habits', 'transactions'];
  for (const key of required) {
    if (!Array.isArray(inner[key])) return { valid: false, error: `Missing table: ${key}` };
  }
  return { valid: true };
}
