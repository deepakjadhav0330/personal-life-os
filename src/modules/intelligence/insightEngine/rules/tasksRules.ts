// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Tasks Rules
// Pure function: takes data arrays, returns Insight[].
// ─────────────────────────────────────────────────────────────

import { format, parseISO, addDays } from 'date-fns';
import type { Task } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import { hashMetrics, todayISO, thisWeekRange, safePct } from '../insightUtils';

export function tasksRules(tasks: Task[]): Insight[] {
  const insights: Insight[] = [];
  const today    = todayISO();
  const thisWeek = thisWeekRange(1);

  if (!tasks.length) return [];

  // ── Overdue tasks ─────────────────────────────────────────
  const overdue = tasks.filter(
    t => t.status === 'pending' && t.dueDate && t.dueDate < today,
  );
  const overdueHighPriority = overdue.filter(t => t.priority === 'high');

  if (overdue.length > 0) {
    insights.push({
      id:               'tasks-overdue',
      category:         'tasks',
      title:            overdue.length === 1
        ? '1 overdue task'
        : `${overdue.length} overdue tasks`,
      explanation:      overdueHighPriority.length > 0
        ? `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}, including ${overdueHighPriority.length} marked high priority.`
        : `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}.`,
      supportingMetric: overdueHighPriority.length > 0
        ? `${overdueHighPriority.length} high priority`
        : `${overdue.length} pending`,
      severity:         overdueHighPriority.length > 0 ? 'critical' : 'attention',
      recommendedAction: 'Start with the highest-priority overdue task.',
      actionPath:       '/tasks',
      generatedAt:      today,
      dataHash: hashMetrics({ cnt: overdue.length, hp: overdueHighPriority.length }),
    });
  }

  // ── This week completion rate ─────────────────────────────
  const dueThisWeek = tasks.filter(
    t => t.dueDate && t.dueDate >= thisWeek.start && t.dueDate <= thisWeek.end,
  );
  const completedThisWeek = tasks.filter(
    t => t.completedAt && t.completedAt.slice(0, 10) >= thisWeek.start && t.completedAt.slice(0, 10) <= today,
  );

  if (completedThisWeek.length > 0 || dueThisWeek.length > 0) {
    const total  = new Set([...completedThisWeek, ...dueThisWeek].map(t => t.id)).size;
    const done   = completedThisWeek.length;
    const rate   = safePct(done, total);

    if (rate >= 80) {
      insights.push({
        id:               'tasks-week-completion',
        category:         'tasks',
        title:            'Strong task completion this week',
        explanation:      `You've completed ${done} of ${total} task${total > 1 ? 's' : ''} due or worked on this week.`,
        supportingMetric: `${rate}% completion rate`,
        comparisonPeriod: 'This week',
        severity:         'positive',
        actionPath:       '/tasks',
        generatedAt:      today,
        dataHash: hashMetrics({ done, total, ws: thisWeek.start }),
      });
    } else if (rate < 50 && total >= 3) {
      insights.push({
        id:               'tasks-week-completion',
        category:         'tasks',
        title:            'Task completion rate is low this week',
        explanation:      `Only ${done} of ${total} task${total > 1 ? 's' : ''} due or started this week have been completed.`,
        supportingMetric: `${rate}% completion rate`,
        comparisonPeriod: 'This week',
        severity:         'attention',
        recommendedAction: 'Focus on clearing the highest-priority pending items first.',
        actionPath:       '/tasks',
        generatedAt:      today,
        dataHash: hashMetrics({ done, total, ws: thisWeek.start }),
      });
    }
  }

  // ── Upcoming deadlines (next 2 days) ─────────────────────
  const twoDaysOut = format(addDays(parseISO(today), 2), 'yyyy-MM-dd');
  const upcoming   = tasks.filter(
    t =>
      t.status === 'pending' &&
      t.dueDate &&
      t.dueDate > today &&
      t.dueDate <= twoDaysOut,
  );

  if (upcoming.length > 0) {
    const highCount = upcoming.filter(t => t.priority === 'high').length;
    const daysStr   = upcoming.length === 1
      ? `task due in the next 2 days`
      : `tasks due in the next 2 days`;
    insights.push({
      id:               'tasks-upcoming',
      category:         'tasks',
      title:            `${upcoming.length} ${daysStr}`,
      explanation:      highCount > 0
        ? `${upcoming.length} pending task${upcoming.length > 1 ? 's are' : ' is'} due soon, including ${highCount} high priority.`
        : `${upcoming.length} pending task${upcoming.length > 1 ? 's are' : ' is'} due in the next 2 days.`,
      supportingMetric: highCount > 0 ? `${highCount} high priority` : `${upcoming.length} upcoming`,
      severity:         highCount > 0 ? 'attention' : 'positive',
      recommendedAction: 'Make sure these are on your radar for today.',
      actionPath:       '/tasks',
      generatedAt:      today,
      dataHash: hashMetrics({ cnt: upcoming.length, hp: highCount }),
    });
  }

  return insights;
}
