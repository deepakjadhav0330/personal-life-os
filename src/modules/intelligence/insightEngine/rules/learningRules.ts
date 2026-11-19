// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Learning Rules
// Pure function: takes data arrays, returns Insight[].
// Only calculates time if the user actually records sessions.
// ─────────────────────────────────────────────────────────────

import { differenceInDays, parseISO } from 'date-fns';
import type { LearningItem, LearningSession } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import { hashMetrics, todayISO, thisWeekRange, lastWeekRange } from '../insightUtils';
import { formatMinutes } from '../../../../utils/format';

export function learningRules(
  items: LearningItem[],
  sessions: LearningSession[],
): Insight[] {
  const insights: Insight[] = [];
  const today    = todayISO();
  const thisWeek = thisWeekRange(1);
  const lastWeek = lastWeekRange(1);

  const activeItems = items.filter(i => i.status === 'active' || i.status === 'paused');
  if (!activeItems.length && !sessions.length) return [];

  // ── Active items with no recent progress ─────────────────
  const stalled: LearningItem[] = [];
  for (const item of activeItems) {
    if (!item.id) continue;
    const itemSessions = sessions.filter(s => s.learningItemId === item.id);
    const lastSession  = itemSessions.sort((a, b) => b.date.localeCompare(a.date))[0];

    const lastActivityDate = lastSession?.date ?? item.updatedAt?.slice(0, 10) ?? item.createdAt.slice(0, 10);
    const daysSince = differenceInDays(parseISO(today), parseISO(lastActivityDate));

    if (daysSince >= 14) stalled.push(item);
  }

  // Show at most 2 stalled items
  stalled.slice(0, 2).forEach(item => {
    const itemSessions   = sessions.filter(s => s.learningItemId === item.id);
    const lastSession    = itemSessions.sort((a, b) => b.date.localeCompare(a.date))[0];
    const lastDate       = lastSession?.date ?? item.updatedAt?.slice(0, 10) ?? item.createdAt.slice(0, 10);
    const daysSince      = differenceInDays(parseISO(today), parseISO(lastDate));

    insights.push({
      id:               `learning-stalled-${item.id}`,
      category:         'learning',
      title:            `"${item.title}" has no recent progress`,
      explanation:      `No sessions recorded for "${item.title}" in ${daysSince} days.`,
      supportingMetric: `${item.progress}% complete · Last activity ${daysSince} days ago`,
      severity:         daysSince >= 30 ? 'critical' : 'attention',
      recommendedAction: 'Even a short 15-minute session can rebuild the habit.',
      actionPath:       '/learning',
      generatedAt:      today,
      dataHash: hashMetrics({ iid: item.id, staleBucket: Math.floor(daysSince / 7) }),
    });
  });

  // ── Weekly learning time comparison ──────────────────────
  if (sessions.length > 0) {
    const minsThisWeek = sessions
      .filter(s => s.date >= thisWeek.start && s.date <= today)
      .reduce((s, l) => s + l.durationMinutes, 0);

    const minsLastWeek = sessions
      .filter(s => s.date >= lastWeek.start && s.date <= lastWeek.end)
      .reduce((s, l) => s + l.durationMinutes, 0);

    if (minsLastWeek > 0 || minsThisWeek > 0) {
      if (minsThisWeek >= minsLastWeek * 0.9 && minsThisWeek > 0) {
        insights.push({
          id:               'learning-time-consistent',
          category:         'learning',
          title:            'Consistent learning time this week',
          explanation:      `You've logged ${formatMinutes(minsThisWeek)} of learning this week, on track with last week (${formatMinutes(minsLastWeek)}).`,
          supportingMetric: `${formatMinutes(minsThisWeek)} this week`,
          comparisonPeriod: `vs ${formatMinutes(minsLastWeek)} last week`,
          severity:         'positive',
          actionPath:       '/learning',
          generatedAt:      today,
          dataHash: hashMetrics({ thisBucket: Math.floor(minsThisWeek / 15) * 15, lastBucket: Math.floor(minsLastWeek / 15) * 15, ws: thisWeek.start }),
        });
      } else if (minsLastWeek > 0 && minsThisWeek < minsLastWeek * 0.5) {
        insights.push({
          id:               'learning-time-dropped',
          category:         'learning',
          title:            'Learning time is down this week',
          explanation:      `Only ${formatMinutes(minsThisWeek)} of learning recorded this week so far, versus ${formatMinutes(minsLastWeek)} last week.`,
          supportingMetric: `${formatMinutes(minsThisWeek)} this week`,
          comparisonPeriod: `vs ${formatMinutes(minsLastWeek)} last week`,
          severity:         'attention',
          recommendedAction: 'Even a short reading or lesson session can keep the habit alive.',
          actionPath:       '/learning',
          generatedAt:      today,
          dataHash: hashMetrics({ thisBucket: Math.floor(minsThisWeek / 15) * 15, lastBucket: Math.floor(minsLastWeek / 15) * 15, ws: thisWeek.start }),
        });
      } else if (minsLastWeek === 0 && minsThisWeek > 0) {
        insights.push({
          id:               'learning-time-new',
          category:         'learning',
          title:            `Learning session recorded this week`,
          explanation:      `You've logged ${formatMinutes(minsThisWeek)} of learning this week.`,
          supportingMetric: `${formatMinutes(minsThisWeek)} this week`,
          severity:         'positive',
          actionPath:       '/learning',
          generatedAt:      today,
          dataHash: hashMetrics({ thisBucket: Math.floor(minsThisWeek / 15) * 15, ws: thisWeek.start }),
        });
      }
    }
  }

  // ── Recently completed item ───────────────────────────────
  const last7Start = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const recentlyCompleted = items.find(
    i => i.status === 'completed' && i.updatedAt && i.updatedAt.slice(0, 10) >= last7Start,
  );

  if (recentlyCompleted) {
    insights.push({
      id:               `learning-completed-${recentlyCompleted.id}`,
      category:         'learning',
      title:            `Completed "${recentlyCompleted.title}"`,
      explanation:      `You finished "${recentlyCompleted.title}" in the last 7 days. Great progress.`,
      supportingMetric: `${recentlyCompleted.type.charAt(0).toUpperCase() + recentlyCompleted.type.slice(1)} completed`,
      severity:         'positive',
      actionPath:       '/learning',
      generatedAt:      today,
      dataHash: hashMetrics({ iid: recentlyCompleted.id, completedDate: recentlyCompleted.updatedAt?.slice(0, 10) }),
    });
  }

  return insights;
}
