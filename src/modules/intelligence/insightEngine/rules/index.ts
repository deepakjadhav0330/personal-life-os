// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Rule Orchestrator
// runAllRules takes all fetched data and delegates to each
// category rule module. Returns a full InsightGroup[].
// ─────────────────────────────────────────────────────────────

import type {
  Transaction, Budget, Habit, HabitCompletion,
  Workout, BodyMeasurement, NutritionLog,
  Goal, Milestone, Task, LearningItem, LearningSession,
} from '../../../../db/schema';
import type { InsightGroup } from '../insightTypes';
import { CATEGORY_LABELS } from '../insightUtils';

import { financeRules  } from './financeRules';
import { habitsRules   } from './habitsRules';
import { goalsRules    } from './goalsRules';
import { tasksRules    } from './tasksRules';
import { fitnessRules  } from './fitnessRules';
import { learningRules } from './learningRules';

/** All data needed to run the full insight engine. */
export interface InsightRuleInput {
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

/**
 * Run all rule modules and return a complete InsightGroup[]
 * ordered by category. Pure function — no DB access, no side effects.
 */
export function runAllRules(input: InsightRuleInput): InsightGroup[] {
  const {
    transactions, budgets, currency,
    habits, habitCompletions, weekStartsOn,
    goals, milestones,
    tasks,
    workouts, bodyMeasurements, nutritionLogs,
    learningItems, learningSessions,
    weightUnit,
  } = input;

  const hasFinanceData  = transactions.length > 0;
  const hasFitnessData  = workouts.length > 0 || bodyMeasurements.length > 0;
  const hasHabitsData   = habits.length > 0;
  const hasGoalsData    = goals.length > 0;
  const hasTasksData    = tasks.length > 0;
  const hasLearningData = learningItems.length > 0;

  return [
    {
      category: 'finance',
      label:    CATEGORY_LABELS.finance,
      hasData:  hasFinanceData,
      insights: hasFinanceData
        ? financeRules(transactions, budgets, currency)
        : [],
    },
    {
      category: 'fitness',
      label:    CATEGORY_LABELS.fitness,
      hasData:  hasFitnessData,
      insights: hasFitnessData
        ? fitnessRules(workouts, bodyMeasurements, nutritionLogs, weightUnit)
        : [],
    },
    {
      category: 'habits',
      label:    CATEGORY_LABELS.habits,
      hasData:  hasHabitsData,
      insights: hasHabitsData
        ? habitsRules(habits, habitCompletions, weekStartsOn)
        : [],
    },
    {
      category: 'goals',
      label:    CATEGORY_LABELS.goals,
      hasData:  hasGoalsData,
      insights: hasGoalsData
        ? goalsRules(goals, milestones)
        : [],
    },
    {
      category: 'tasks',
      label:    CATEGORY_LABELS.tasks,
      hasData:  hasTasksData,
      insights: hasTasksData
        ? tasksRules(tasks)
        : [],
    },
    {
      category: 'learning',
      label:    CATEGORY_LABELS.learning,
      hasData:  hasLearningData,
      insights: hasLearningData
        ? learningRules(learningItems, learningSessions)
        : [],
    },
    {
      // Daily Activity is architecturally unavailable — no step tracking table exists.
      category: 'daily_activity',
      label:    CATEGORY_LABELS.daily_activity,
      hasData:  false,
      insights: [],
    },
  ];
}
