// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Fitness Rules
// Pure function: takes data arrays, returns Insight[].
// No medical claims. No assumptions about targets if none are set.
// ─────────────────────────────────────────────────────────────

import type { Workout, BodyMeasurement, NutritionLog } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import { hashMetrics, todayISO, thisWeekRange, lastWeekRange, lastNDaysRange } from '../insightUtils';
import { formatNumber } from '../../../../utils/format';

export function fitnessRules(
  workouts: Workout[],
  bodyMeasurements: BodyMeasurement[],
  nutritionLogs: NutritionLog[],
  weightUnit: 'kg' | 'lbs' = 'kg',
): Insight[] {
  const insights: Insight[] = [];
  const today    = todayISO();
  const thisWeek = thisWeekRange(1);
  const lastWeek = lastWeekRange(1);

  // ── Workout frequency ─────────────────────────────────────
  const workoutsThisWeek = workouts.filter(
    w => w.date >= thisWeek.start && w.date <= today,
  ).length;

  const workoutsLastWeek = workouts.filter(
    w => w.date >= lastWeek.start && w.date <= lastWeek.end,
  ).length;

  if (workoutsLastWeek > 0 || workoutsThisWeek > 0) {
    if (workoutsLastWeek > 0 && workoutsThisWeek === 0) {
      // Week in progress — only flag if we're past mid-week (Thursday+)
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
      if (dayOfWeek >= 4) {
        insights.push({
          id:               'fitness-workouts-none-this-week',
          category:         'fitness',
          title:            'No workouts recorded this week yet',
          explanation:      `You completed ${workoutsLastWeek} workout${workoutsLastWeek > 1 ? 's' : ''} last week. The week is more than half over.`,
          supportingMetric: `${workoutsLastWeek} last week · 0 this week`,
          comparisonPeriod: 'This week vs last week',
          severity:         'attention',
          recommendedAction: 'Even a short session can help maintain consistency.',
          actionPath:       '/fitness',
          generatedAt:      today,
          dataHash: hashMetrics({ thisWeek: 0, lastWeek: workoutsLastWeek, ws: thisWeek.start }),
        });
      }
    } else if (workoutsLastWeek > 0 && workoutsThisWeek > 0) {
      const pctOfLast = Math.round((workoutsThisWeek / workoutsLastWeek) * 100);

      if (pctOfLast >= 100) {
        insights.push({
          id:               'fitness-workouts-keeping-up',
          category:         'fitness',
          title:            'Maintaining workout frequency',
          explanation:      `${workoutsThisWeek} workout${workoutsThisWeek > 1 ? 's' : ''} this week so far, on track with last week's pace (${workoutsLastWeek}).`,
          supportingMetric: `${workoutsThisWeek} this week · ${workoutsLastWeek} last week`,
          comparisonPeriod: 'This week vs last week',
          severity:         'positive',
          actionPath:       '/fitness',
          generatedAt:      today,
          dataHash: hashMetrics({ thisWeek: workoutsThisWeek, lastWeek: workoutsLastWeek, ws: thisWeek.start }),
        });
      } else if (pctOfLast < 60) {
        insights.push({
          id:               'fitness-workouts-declining',
          category:         'fitness',
          title:            'Workout frequency down this week',
          explanation:      `${workoutsThisWeek} workout${workoutsThisWeek > 1 ? 's' : ''} so far this week compared to ${workoutsLastWeek} last week.`,
          supportingMetric: `${workoutsThisWeek} this week · ${workoutsLastWeek} last week`,
          comparisonPeriod: 'This week vs last week',
          severity:         'attention',
          recommendedAction: 'Try to fit in one more session before the end of the week.',
          actionPath:       '/fitness',
          generatedAt:      today,
          dataHash: hashMetrics({ thisWeek: workoutsThisWeek, lastWeek: workoutsLastWeek, ws: thisWeek.start }),
        });
      }
    } else if (workoutsThisWeek > 0 && workoutsLastWeek === 0) {
      // No last week data but tracking this week — positive
      insights.push({
        id:               'fitness-workouts-new',
        category:         'fitness',
        title:            `${workoutsThisWeek} workout${workoutsThisWeek > 1 ? 's' : ''} recorded this week`,
        explanation:      `You've logged ${workoutsThisWeek} workout${workoutsThisWeek > 1 ? 's' : ''} this week. Keep the momentum going.`,
        supportingMetric: `${workoutsThisWeek} this week`,
        severity:         'positive',
        actionPath:       '/fitness',
        generatedAt:      today,
        dataHash: hashMetrics({ thisWeek: workoutsThisWeek, ws: thisWeek.start }),
      });
    }
  }

  // ── Body weight trend (only if 2+ measurements exist) ────
  const weightMeasurements = bodyMeasurements.filter(m => m.type === 'weight');
  if (weightMeasurements.length >= 2) {
    const latest   = weightMeasurements[0]; // already sorted most recent first
    const previous = weightMeasurements[1];
    const delta    = latest.value - previous.value;
    const absDelta = Math.abs(delta);

    // Only surface if the change is at least 0.3 kg / 0.6 lbs (meaningful)
    const minDelta = weightUnit === 'kg' ? 0.3 : 0.6;

    if (absDelta >= minDelta) {
      const changeStr = `${delta > 0 ? '+' : ''}${formatNumber(delta)} ${latest.unit}`;
      insights.push({
        id:               'fitness-weight-trend',
        category:         'fitness',
        title:            delta > 0 ? 'Weight trending up' : 'Weight trending down',
        explanation:      `Your last recorded weight (${formatNumber(latest.value)} ${latest.unit} on ${latest.date}) is ${changeStr} compared to the previous measurement (${formatNumber(previous.value)} ${previous.unit} on ${previous.date}).`,
        supportingMetric: changeStr,
        comparisonPeriod: `${previous.date} → ${latest.date}`,
        severity:         'positive', // We surface the trend factually; no health judgement
        actionPath:       '/fitness',
        generatedAt:      today,
        dataHash: hashMetrics({ latest: Math.round(latest.value * 10), prev: Math.round(previous.value * 10), date: latest.date }),
      });
    }
  }

  // ── Nutrition logging consistency (last 7 days) ───────────
  const last7 = lastNDaysRange(7);
  const daysLogged = nutritionLogs.filter(log => {
    if (log.date < last7.start || log.date > today) return false;
    const totalCal = log.meals.flatMap(m => m.foods).reduce((s, f) => s + f.calories, 0);
    return totalCal > 0;
  }).length;

  if (daysLogged >= 5) {
    insights.push({
      id:               'fitness-nutrition-consistent',
      category:         'fitness',
      title:            'Consistent nutrition logging',
      explanation:      `You logged food on ${daysLogged} of the last 7 days. Consistent tracking supports better awareness.`,
      supportingMetric: `${daysLogged}/7 days logged`,
      comparisonPeriod: 'Last 7 days',
      severity:         'positive',
      actionPath:       '/fitness',
      generatedAt:      today,
      dataHash: hashMetrics({ days: daysLogged, range: last7.start }),
    });
  } else if (daysLogged > 0 && daysLogged <= 2) {
    insights.push({
      id:               'fitness-nutrition-inconsistent',
      category:         'fitness',
      title:            'Nutrition logging has been inconsistent',
      explanation:      `Food was logged on only ${daysLogged} of the last 7 days. More consistent logging gives you a clearer picture of your intake.`,
      supportingMetric: `${daysLogged}/7 days logged`,
      comparisonPeriod: 'Last 7 days',
      severity:         'attention',
      recommendedAction: 'Even logging one meal a day provides useful data.',
      actionPath:       '/fitness',
      generatedAt:      today,
      dataHash: hashMetrics({ days: daysLogged, range: last7.start }),
    });
  }

  return insights;
}
