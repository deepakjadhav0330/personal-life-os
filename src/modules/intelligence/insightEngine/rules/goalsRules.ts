// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Goals Rules
// Pure function: takes data arrays, returns Insight[].
// ─────────────────────────────────────────────────────────────

import { differenceInDays, parseISO } from 'date-fns';
import type { Goal, Milestone } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import { hashMetrics, todayISO, safePct } from '../insightUtils';

export function goalsRules(goals: Goal[], milestones: Milestone[]): Insight[] {
  const insights: Insight[] = [];
  const today   = todayISO();
  const todayMs = new Date().getTime();

  if (!goals.length) return [];

  for (const goal of goals) {
    if (!goal.id) continue;

    const goalMilestones = milestones.filter(m => m.goalId === goal.id);

    // ── Compute progress ──────────────────────────────────────
    let progressPct = 0;
    if (goal.progressMode === 'milestones' && goalMilestones.length > 0) {
      const completed = goalMilestones.filter(m => m.status === 'completed').length;
      progressPct = safePct(completed, goalMilestones.length);
    } else if (goal.progressMode === 'manual' && goal.manualProgress != null) {
      progressPct = goal.manualProgress;
    }

    // ── Stalled goal: no updatedAt change in 14+ days ─────────
    const updatedAt   = goal.updatedAt ?? goal.createdAt;
    const daysSinceUpdate = differenceInDays(todayMs, parseISO(updatedAt).getTime());

    if (daysSinceUpdate >= 14 && goal.status === 'active') {
      insights.push({
        id:               `goals-stalled-${goal.id}`,
        category:         'goals',
        title:            `"${goal.title}" hasn't been updated`,
        explanation:      `This ${goal.category} goal hasn't had any recorded progress or update in ${daysSinceUpdate} days.`,
        supportingMetric: `Last updated ${daysSinceUpdate} days ago`,
        comparisonPeriod: undefined,
        severity:         daysSinceUpdate >= 30 ? 'critical' : 'attention',
        recommendedAction: 'Log progress or update this goal to keep momentum.',
        actionPath:       '/goals',
        generatedAt:      today,
        dataHash: hashMetrics({ gid: goal.id, staleBucket: Math.floor(daysSinceUpdate / 7) }),
      });
    }

    // ── Overdue milestones ─────────────────────────────────────
    const overdueMilestones = goalMilestones.filter(
      m => m.status !== 'completed' && m.targetDate && m.targetDate < today,
    );

    if (overdueMilestones.length > 0 && goal.status === 'active') {
      const mostOverdue = overdueMilestones.sort((a, b) =>
        (a.targetDate ?? '').localeCompare(b.targetDate ?? ''),
      )[0];
      const daysOverdue = differenceInDays(
        todayMs,
        parseISO(mostOverdue.targetDate!).getTime(),
      );

      insights.push({
        id:               `goals-overdue-milestone-${goal.id}`,
        category:         'goals',
        title:            `Overdue milestone in "${goal.title}"`,
        explanation:      `${overdueMilestones.length} milestone${overdueMilestones.length > 1 ? 's are' : ' is'} past due. The most overdue was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago.`,
        supportingMetric: `${overdueMilestones.length} overdue milestone${overdueMilestones.length > 1 ? 's' : ''}`,
        severity:         daysOverdue >= 14 ? 'critical' : 'attention',
        recommendedAction: 'Complete or reschedule the overdue milestones to keep this goal on track.',
        actionPath:       '/goals',
        generatedAt:      today,
        dataHash: hashMetrics({ gid: goal.id, overdueCnt: overdueMilestones.length, daysBucket: Math.floor(daysOverdue / 7) }),
      });
    }

    // ── Progressing well ──────────────────────────────────────
    if (
      progressPct >= 50 &&
      goal.status === 'active' &&
      !insights.some(i => i.id === `goals-stalled-${goal.id}`)
    ) {
      insights.push({
        id:               `goals-progressing-${goal.id}`,
        category:         'goals',
        title:            `"${goal.title}" is progressing well`,
        explanation:      `This ${goal.category} goal is ${progressPct}% complete.${goal.targetDate ? ` Target date: ${goal.targetDate}.` : ''}`,
        supportingMetric: `${progressPct}% complete`,
        severity:         'positive',
        actionPath:       '/goals',
        generatedAt:      today,
        dataHash: hashMetrics({ gid: goal.id, pctBucket: Math.floor(progressPct / 10) * 10 }),
      });
    }
  }

  // ── Limit positive insights to top 2 (avoid overwhelming the section)
  const positives  = insights.filter(i => i.severity === 'positive').slice(0, 2);
  const actionable = insights.filter(i => i.severity !== 'positive');

  return [...actionable, ...positives];
}
