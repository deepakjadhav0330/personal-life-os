// ─────────────────────────────────────────────────────────────
// Personal Life OS — Database Schema (TypeScript Interfaces)
// All data is stored locally in IndexedDB via Dexie.js.
// No personal data is ever transmitted to any external server.
// ─────────────────────────────────────────────────────────────

export interface Setting {
  id?: number;
  key: string;
  value: string; // JSON-stringified
  updatedAt: string;
}

// ─── TASKS ───────────────────────────────────────────────────
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'personal' | 'work' | 'fitness' | 'learning' | 'finance' | 'other';
export type TaskStatus = 'pending' | 'completed';
export type RecurringFrequency = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  dueDate?: string;       // YYYY-MM-DD
  dueTime?: string;       // HH:MM
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringParentId?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── HABITS ──────────────────────────────────────────────────
export type HabitCategory = 'health' | 'fitness' | 'learning' | 'mindfulness' | 'productivity' | 'finance' | 'personal' | 'other';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'specific_days';

export interface Habit {
  id?: number;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  targetDays?: number[];  // 0=Sun … 6=Sat (for specific_days)
  timesPerWeek?: number;  // for weekly
  color: string;          // hex color
  icon: string;           // lucide icon name
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface HabitCompletion {
  id?: number;
  habitId: number;
  date: string;        // YYYY-MM-DD
  completedAt: string; // ISO
}

// ─── FITNESS ─────────────────────────────────────────────────
export type WorkoutStatus = 'active' | 'completed';
export type ExerciseEquipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'resistance_band' | 'other';
export type ExerciseType = 'compound' | 'isolation' | 'cardio' | 'other';
export type MeasurementType = 'weight' | 'body_fat' | 'waist' | 'chest' | 'hips' | 'arms' | 'shoulders' | 'thighs' | 'neck' | 'custom';

export interface Workout {
  id?: number;
  name?: string;
  date: string;         // YYYY-MM-DD
  startedAt: string;    // ISO
  completedAt?: string; // ISO
  duration?: number;    // minutes
  status: WorkoutStatus;
  notes?: string;
  type?: string;
}

export interface WorkoutSet {
  id?: number;
  workoutId: number;
  exerciseId: number;
  setNumber: number;
  weight?: number;      // kg
  reps?: number;
  rpe?: number;         // 1–10
  duration?: number;    // seconds (cardio)
  distance?: number;    // meters (cardio)
  isCompleted: boolean;
  isPR?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Exercise {
  id?: number;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: ExerciseEquipment;
  type: ExerciseType;
  instructions: string;
  isCustom: boolean;
  createdAt: string;
}

export interface BodyMeasurement {
  id?: number;
  date: string;              // YYYY-MM-DD
  type: MeasurementType;
  customType?: string;
  value: number;
  unit: string;              // kg, %, cm, lbs
  notes?: string;
  createdAt: string;
}

// ─── NUTRITION ───────────────────────────────────────────────
export type MealName = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface NutritionFood {
  id: string;             // nanoid
  foodItemId?: number;
  customName?: string;
  calories: number;
  protein: number;        // g
  carbs: number;          // g
  fat: number;            // g
  amount: number;
  unit: string;           // g, ml, serving, piece
}

export interface NutritionMeal {
  id: string;
  name: MealName;
  foods: NutritionFood[];
}

export interface NutritionLog {
  id?: number;
  date: string;           // YYYY-MM-DD
  meals: NutritionMeal[];
  waterMl: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodItem {
  id?: number;
  name: string;
  brand?: string;
  category: string;
  calories: number;       // per serving
  protein: number;        // g
  carbs: number;          // g
  fat: number;            // g
  fiber?: number;         // g
  sugar?: number;         // g
  servingSize: number;
  servingUnit: string;
  createdAt: string;
}

// ─── FINANCE ─────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';

export const EXPENSE_CATEGORIES = [
  'food', 'groceries', 'shopping', 'travel', 'transport',
  'entertainment', 'fitness', 'healthcare', 'bills', 'subscriptions', 'other',
] as const;

export const INCOME_CATEGORIES = [
  'salary', 'freelance', 'investment', 'gift', 'other',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  currency: string;        // 'INR', 'USD', etc.
  date: string;            // YYYY-MM-DD
  category: string;
  paymentMethod: PaymentMethod;
  description?: string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: string;
  recurringParentId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id?: number;
  year: number;
  month: number;           // 1–12
  category: string;
  limit: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── JOURNAL ─────────────────────────────────────────────────
export type JournalMood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';
export type JournalEntryType = 'entry' | 'thought-analysis';

export interface JournalEntry {
  id?: number;
  date: string;            // YYYY-MM-DD
  type: JournalEntryType;
  freeText?: string;
  templateAnswers?: {
    wentWell?: string;
    improved?: string;
    learned?: string;
    challenged?: string;
    grateful?: string;
    tomorrowPriority?: string;
  };
  thoughtAnalysis?: {
    situation?: string;
    facts?: string;
    assumptions?: string;
    emotions?: string;
    control?: string;
    action?: string;
  };
  mood?: JournalMood;
  gratitude?: string[];
  wordCount?: number;
  linkedEntryId?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── GOALS ───────────────────────────────────────────────────
export type GoalCategory = 'fitness' | 'career' | 'finance' | 'learning' | 'personal' | 'relationships' | 'lifestyle';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface Goal {
  id?: number;
  title: string;
  category: GoalCategory;
  description?: string;
  targetDate?: string;      // YYYY-MM-DD
  successMetric?: string;
  targetValue?: number;
  currentValue?: number;
  status: GoalStatus;
  color: string;
  progressMode: 'milestones' | 'manual';
  manualProgress?: number;  // 0–100
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id?: number;
  goalId: number;
  title: string;
  description?: string;
  targetDate?: string;      // YYYY-MM-DD
  status: 'pending' | 'completed';
  completedAt?: string;
  order: number;
  createdAt: string;
}

// ─── REMINDERS ───────────────────────────────────────────────
export type ReminderStatus = 'pending' | 'triggered' | 'dismissed';
export type ReminderRepeat = 'once' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id?: number;
  title: string;
  description?: string;
  scheduledAt: string;      // ISO datetime
  repeat: ReminderRepeat;
  type: 'general' | 'task' | 'habit' | 'goal';
  linkedId?: number;
  status: ReminderStatus;
  createdAt: string;
}

// ─── LEARNING ────────────────────────────────────────────────
export type LearningItemType = 'book' | 'course' | 'skill';
export type LearningStatus = 'active' | 'completed' | 'paused';

export interface LearningItem {
  id?: number;
  type: LearningItemType;
  title: string;
  author?: string;          // books
  platform?: string;        // courses
  url?: string;
  targetDate?: string;
  status: LearningStatus;
  totalPages?: number;
  currentPage?: number;
  totalLessons?: number;
  completedLessons?: number;
  progress: number;         // 0–100
  notes?: string;
  coverColor: string;
  takeaways?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningSession {
  id?: number;
  learningItemId: number;
  date: string;             // YYYY-MM-DD
  durationMinutes: number;
  progressDelta: number;
  notes?: string;
  takeaway?: string;
  createdAt: string;
}

// ─── APP SETTINGS KEYS ───────────────────────────────────────
export interface AppSettings {
  name: string;
  avatarColor: string;
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  weekStartsOn: 0 | 1;    // 0=Sunday, 1=Monday
  weightUnit: 'kg' | 'lbs';
  calorieTarget: number;
  proteinTarget: number;    // g
  carbTarget: number;       // g
  fatTarget: number;        // g
  waterTarget: number;      // ml
  dashboardConfig: DashboardWidgetConfig[];
  hasSeenWelcome: boolean;
  hasSeenBackupWarning: boolean;
  notificationsEnabled: boolean;
}

export interface DashboardWidgetConfig {
  widgetId: string;
  label: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  name: '',
  avatarColor: '#7c3aed',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  weekStartsOn: 1,
  weightUnit: 'kg',
  calorieTarget: 2200,
  proteinTarget: 150,
  carbTarget: 220,
  fatTarget: 70,
  waterTarget: 2500,
  dashboardConfig: [
    { widgetId: 'greeting', label: 'Greeting', visible: true, order: 0 },
    { widgetId: 'daily-summary', label: 'Daily Summary', visible: true, order: 1 },
    { widgetId: 'tasks', label: 'Tasks', visible: true, order: 2 },
    { widgetId: 'habits', label: 'Habit Progress', visible: true, order: 3 },
    { widgetId: 'quick-stats', label: 'Quick Stats', visible: true, order: 4 },
    { widgetId: 'goals', label: 'Goals', visible: true, order: 5 },
    { widgetId: 'reminders', label: 'Reminders', visible: true, order: 6 },
    { widgetId: 'quick-actions', label: 'Quick Actions', visible: true, order: 7 },
  ],
  hasSeenWelcome: false,
  hasSeenBackupWarning: false,
  notificationsEnabled: false,
};
