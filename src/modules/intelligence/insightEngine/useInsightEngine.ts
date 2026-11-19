// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — useInsightEngine Hook
// Fetches all data reactively via useLiveQuery, runs the pure
// rule functions, applies dismiss filtering, and exposes the
// dismiss/undismiss actions.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSetting } from '../../../hooks/useSetting';
import type { InsightEngineResult, InsightGroup, OverallStatus } from './insightTypes';
import { CATEGORY_LABELS } from './insightUtils';
import {
  getDismissedMap,
  persistDismissInsight,
  persistUndismissInsight,
  isInsightDismissed,
  type DismissMap,
} from './insightUtils';
import { runAllRules } from './rules';
import {
  fetchTransactions,
  fetchCurrentBudgets,
  fetchActiveHabits,
  fetchHabitCompletions,
  fetchActiveGoals,
  fetchAllMilestones,
  fetchAllTasks,
  fetchRecentWorkouts,
  fetchBodyMeasurements,
  fetchNutritionLogs,
  fetchLearningItems,
  fetchLearningSessions,
} from './insightSelectors';

// ─── Overall status summary ───────────────────────────────────

function buildOverallStatus(
  positiveCount: number,
  attentionCount: number,
  criticalCount: number,
  groups: InsightGroup[],
): OverallStatus {
  let summary: string;

  if (criticalCount > 0) {
    const critCats = [...new Set(
      groups
        .flatMap(g => g.insights)
        .filter(i => i.severity === 'critical')
        .map(i => CATEGORY_LABELS[i.category].toLowerCase()),
    )].slice(0, 2);
    summary = critCats.length === 1
      ? `Your ${critCats[0]} needs immediate attention.`
      : `Your ${critCats.join(' and ')} need immediate attention.`;
  } else if (attentionCount >= 3) {
    summary = 'Several areas could use your attention this week.';
  } else if (attentionCount === 2) {
    const attCats = [...new Set(
      groups
        .flatMap(g => g.insights)
        .filter(i => i.severity === 'attention')
        .map(i => CATEGORY_LABELS[i.category].toLowerCase()),
    )].slice(0, 2);
    summary = `Good progress overall. Your ${attCats.join(' and ')} could use some attention.`;
  } else if (attentionCount === 1) {
    const attCat = groups.flatMap(g => g.insights).find(i => i.severity === 'attention')?.category;
    const label  = attCat ? CATEGORY_LABELS[attCat].toLowerCase() : 'one area';
    summary = `You're doing well overall. ${label.charAt(0).toUpperCase() + label.slice(1)} could use some attention.`;
  } else if (positiveCount > 0) {
    summary = 'Great work — everything is on track this week.';
  } else {
    summary = 'Add more data over time and Intelligence will start showing personalised insights.';
  }

  return { summary, positiveCount, attentionCount, criticalCount };
}

// ─── Hook ─────────────────────────────────────────────────────

export function useInsightEngine(): InsightEngineResult {
  // ── Settings ──────────────────────────────────────────────
  const [currency]     = useSetting('currency', 'INR');
  const [weekStartsOn] = useSetting<0 | 1>('weekStartsOn', 1);
  const [weightUnit]   = useSetting<'kg' | 'lbs'>('weightUnit', 'kg');

  // ── Live data queries ─────────────────────────────────────
  // Each returns undefined while loading (Dexie pending state).

  const transactions = useLiveQuery(() => fetchTransactions(3), [], undefined);
  const budgets      = useLiveQuery(() => fetchCurrentBudgets(),  [], undefined);
  const habits       = useLiveQuery(() => fetchActiveHabits(),    [], undefined);
  const completions  = useLiveQuery(() => fetchHabitCompletions(21), [], undefined);
  const goals        = useLiveQuery(() => fetchActiveGoals(),     [], undefined);
  const milestones   = useLiveQuery(() => fetchAllMilestones(),   [], undefined);
  const tasks        = useLiveQuery(() => fetchAllTasks(),        [], undefined);
  const workouts     = useLiveQuery(() => fetchRecentWorkouts(4), [], undefined);
  const bodyMeasurements = useLiveQuery(() => fetchBodyMeasurements(),  [], undefined);
  const nutritionLogs    = useLiveQuery(() => fetchNutritionLogs(14),   [], undefined);
  const learningItems    = useLiveQuery(() => fetchLearningItems(),      [], undefined);
  const learningSessions = useLiveQuery(() => fetchLearningSessions(4),  [], undefined);

  const loading = [
    transactions, budgets, habits, completions, goals, milestones,
    tasks, workouts, bodyMeasurements, nutritionLogs, learningItems, learningSessions,
  ].some(v => v === undefined);

  // ── Dismiss map — read from localStorage once, updated on dismiss actions
  const [dismissMap, setDismissMap] = useState<DismissMap>(() => getDismissedMap());

  // ── Run rules (memoised on data changes) ──────────────────
  const { groups, overallStatus, priorityInsights } = useMemo(() => {
    if (loading) {
      return {
        groups: [],
        overallStatus: { summary: '', positiveCount: 0, attentionCount: 0, criticalCount: 0 },
        priorityInsights: [],
      };
    }

    // Run all pure rule modules
    const rawGroups = runAllRules({
      transactions:     transactions ?? [],
      budgets:          budgets      ?? [],
      currency,
      habits:           habits       ?? [],
      habitCompletions: completions  ?? [],
      weekStartsOn,
      goals:            goals        ?? [],
      milestones:       milestones   ?? [],
      tasks:            tasks        ?? [],
      workouts:         workouts     ?? [],
      bodyMeasurements: bodyMeasurements ?? [],
      nutritionLogs:    nutritionLogs    ?? [],
      learningItems:    learningItems    ?? [],
      learningSessions: learningSessions ?? [],
      weightUnit,
    });

    // Apply dismiss filter: an insight is hidden only if its current hash
    // matches the hash stored at dismissal time.
    const filteredGroups = rawGroups.map(group => ({
      ...group,
      insights: group.insights.filter(i => !isInsightDismissed(i.id, i.dataHash, dismissMap)),
    }));

    // Count by severity for overall status
    const allInsights     = filteredGroups.flatMap(g => g.insights);
    const positiveCount   = allInsights.filter(i => i.severity === 'positive').length;
    const attentionCount  = allInsights.filter(i => i.severity === 'attention').length;
    const criticalCount   = allInsights.filter(i => i.severity === 'critical').length;

    const overallStatus = buildOverallStatus(positiveCount, attentionCount, criticalCount, filteredGroups);

    // Priority: top actionable insights, then fill with positives if none
    const actionable = allInsights
      .filter(i => i.severity !== 'positive')
      .sort((a, b) => {
        const order = { critical: 0, attention: 1, positive: 2 } as const;
        return order[a.severity] - order[b.severity];
      })
      .slice(0, 5);

    const priorityInsights = actionable.length > 0
      ? actionable
      : allInsights.filter(i => i.severity === 'positive').slice(0, 3);

    return { groups: filteredGroups, overallStatus, priorityInsights };
  }, [
    loading,
    transactions, budgets, currency,
    habits, completions, weekStartsOn,
    goals, milestones,
    tasks,
    workouts, bodyMeasurements, nutritionLogs,
    learningItems, learningSessions,
    weightUnit,
    dismissMap,
  ]);

  // ── Dismiss actions ───────────────────────────────────────

  const dismissInsight = useCallback((id: string, dataHash: string) => {
    persistDismissInsight(id, dataHash);
    setDismissMap(getDismissedMap());
  }, []);

  const undismissInsight = useCallback((id: string) => {
    persistUndismissInsight(id);
    setDismissMap(getDismissedMap());
  }, []);

  return {
    groups,
    overallStatus,
    priorityInsights,
    loading,
    error: null,
    dismissInsight,
    undismissInsight,
  };
}
