// ─────────────────────────────────────────────────────────────
// Analytics Event Specification
// ─────────────────────────────────────────────────────────────
// RULE: Every property here must be safe metadata only.
//       Never include user-generated content (task names,
//       journal text, amounts, measurements, etc.)
// ─────────────────────────────────────────────────────────────

export type EventName =
  | 'app_opened'
  | 'session_started'
  | 'session_ended'
  | 'module_opened'
  | 'task_created'
  | 'task_completed'
  | 'habit_created'
  | 'habit_completed'
  | 'workout_logged'
  | 'nutrition_logged'
  | 'measurement_logged'
  | 'transaction_created'
  | 'budget_created'
  | 'journal_entry_created'
  | 'goal_created'
  | 'reminder_created'
  | 'receipt_scanned'
  | 'quick_add_used'
  | 'learning_session_logged';

// Strongly typed properties — the index signature allows use as Record<string, ...>
// but all undefined values are stripped before sending to Supabase
export type EventProperties = {
  platform?: string;
  app_version?: string;
  session_key?: string;
  duration_seconds?: number;
  is_estimated?: boolean;
  module_name?: string;
  priority?: string;
  has_due_date?: boolean;
  is_recurring?: boolean;
  frequency?: string;
  category?: string;
  exercise_count?: number;
  duration_minutes?: number;
  measurement_type?: string;
  transaction_type?: string;
  meal_name?: string;
  entry_type?: string;
  has_mood?: boolean;
  progress_mode?: string;
  repeat_type?: string;
  result_type?: string;
  item_type?: string;
};

// Human-readable labels for the admin UI
export const EVENT_LABELS: Record<EventName, string> = {
  app_opened: 'App Opened',
  session_started: 'Session Started',
  session_ended: 'Session Ended',
  module_opened: 'Module Opened',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  habit_created: 'Habit Created',
  habit_completed: 'Habit Completed',
  workout_logged: 'Workout Logged',
  nutrition_logged: 'Nutrition Logged',
  measurement_logged: 'Measurement Logged',
  transaction_created: 'Transaction Created',
  budget_created: 'Budget Created',
  journal_entry_created: 'Journal Entry Created',
  goal_created: 'Goal Created',
  reminder_created: 'Reminder Created',
  receipt_scanned: 'Receipt Scanned',
  quick_add_used: 'Quick Add Used',
  learning_session_logged: 'Learning Session Logged',
};

export const ALL_EVENTS: EventName[] = Object.keys(EVENT_LABELS) as EventName[];
