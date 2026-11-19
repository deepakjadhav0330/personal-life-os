// ─────────────────────────────────────────────────────────────
// Life OS Intelligence — Finance Rules
// Pure function: takes data arrays, returns Insight[].
// No DB access, no side effects.
// ─────────────────────────────────────────────────────────────

import type { Transaction, Budget } from '../../../../db/schema';
import type { Insight } from '../insightTypes';
import {
  hashMetrics,
  currentMTD,
  getPreviousCompleteMonths,
  historicalMTDEnd,
  todayISO,
} from '../insightUtils';
import { formatCurrency, capitalize } from '../../../../utils/format';

export function financeRules(
  transactions: Transaction[],
  budgets: Budget[],
  currency: string,
): Insight[] {
  const insights: Insight[] = [];
  const today = todayISO();
  const mtd   = currentMTD();
  const prevMonths = getPreviousCompleteMonths(3);

  const expenses = transactions.filter(t => t.type === 'expense');

  // ── 1. Budget utilisation ──────────────────────────────────
  for (const budget of budgets) {
    if (!budget.limit || budget.limit <= 0) continue;

    const spent = expenses
      .filter(t => t.category === budget.category && t.date >= mtd.start && t.date <= today)
      .reduce((s, t) => s + t.amount, 0);

    const utilPct = Math.round((spent / budget.limit) * 100);
    // Round to nearest 5% for the hash so minor fluctuations don't unblock dismissals
    const hashPct = Math.floor(utilPct / 5) * 5;
    const dataHash = hashMetrics({ cat: budget.category, hashPct, mk: mtd.monthKey });

    if (utilPct >= 100) {
      insights.push({
        id:               `finance-budget-exceeded-${budget.category}`,
        category:         'finance',
        title:            `${capitalize(budget.category)} budget exceeded`,
        explanation:      `You've spent ${formatCurrency(spent, currency)} against a ${formatCurrency(budget.limit, currency)} budget this month.`,
        supportingMetric: `${utilPct}% utilised`,
        comparisonPeriod: mtd.monthKey,
        severity:         'critical',
        recommendedAction: 'Review recent transactions in this category and avoid further spending if possible.',
        actionPath:       '/finance',
        generatedAt:      today,
        dataHash,
      });
    } else if (utilPct >= 80) {
      insights.push({
        id:               `finance-budget-warn-${budget.category}`,
        category:         'finance',
        title:            `${capitalize(budget.category)} budget at ${utilPct}%`,
        explanation:      `With ${mtd.daysRemaining} day${mtd.daysRemaining !== 1 ? 's' : ''} remaining this month, you've used ${utilPct}% of your ${capitalize(budget.category)} budget.`,
        supportingMetric: `${formatCurrency(spent, currency)} of ${formatCurrency(budget.limit, currency)}`,
        comparisonPeriod: mtd.monthKey,
        severity:         'attention',
        recommendedAction: 'Consider slowing spending in this category for the rest of the month.',
        actionPath:       '/finance',
        generatedAt:      today,
        dataHash,
      });
    } else if (utilPct > 0 && utilPct < 50 && mtd.daysRemaining > 15) {
      // Only surface a positive budget insight when well under halfway and plenty of month left
      insights.push({
        id:               `finance-budget-ok-${budget.category}`,
        category:         'finance',
        title:            `${capitalize(budget.category)} spending on track`,
        explanation:      `Only ${utilPct}% of your ${capitalize(budget.category)} budget used with ${mtd.daysRemaining} days remaining.`,
        supportingMetric: `${formatCurrency(budget.limit - spent, currency)} remaining`,
        comparisonPeriod: mtd.monthKey,
        severity:         'positive',
        generatedAt:      today,
        dataHash,
      });
    }
  }

  // ── 2. Per-category MTD vs historical MTD average ──────────
  // Only run if we have at least 2 previous months of data to compare
  const thisMonthCategories = new Set(
    expenses
      .filter(t => t.date >= mtd.start && t.date <= today)
      .map(t => t.category),
  );

  for (const category of thisMonthCategories) {
    const currentSpend = expenses
      .filter(t => t.category === category && t.date >= mtd.start && t.date <= today)
      .reduce((s, t) => s + t.amount, 0);

    if (currentSpend === 0) continue;

    // Historical MTD spends: each prior month, day 1 to day N
    const histSpends = prevMonths
      .map(m => {
        const histEnd   = historicalMTDEnd(m.year, m.month, mtd.dayOfMonth);
        return expenses
          .filter(t => t.category === category && t.date >= m.start && t.date <= histEnd)
          .reduce((s, t) => s + t.amount, 0);
      })
      .filter(v => v > 0); // ignore months with zero spend in this category

    if (histSpends.length < 2) continue; // not enough history for a meaningful comparison

    const histAvg   = histSpends.reduce((s, v) => s + v, 0) / histSpends.length;
    if (histAvg === 0) continue;

    const changePct = Math.round(((currentSpend - histAvg) / histAvg) * 100);

    // Skip if there's already a budget-based insight for this category
    const coveredByBudget = insights.some(
      i => i.id === `finance-budget-exceeded-${category}` || i.id === `finance-budget-warn-${category}`,
    );

    const dataHash = hashMetrics({
      cat:   category,
      cRnd:  Math.round(currentSpend / 100) * 100,
      hRnd:  Math.round(histAvg / 100) * 100,
      mk:    mtd.monthKey,
    });

    if (changePct >= 50 && !coveredByBudget) {
      insights.push({
        id:               `finance-mtd-spike-${category}`,
        category:         'finance',
        title:            `Higher ${capitalize(category)} spending this month`,
        explanation:      `Your ${capitalize(category)} spending so far this month is ${changePct}% above your ${histSpends.length}-month MTD average.`,
        supportingMetric: `${formatCurrency(currentSpend, currency)} vs ${formatCurrency(Math.round(histAvg), currency)} avg`,
        comparisonPeriod: `Avg of last ${histSpends.length} months (day 1–${mtd.dayOfMonth})`,
        severity:         changePct >= 100 ? 'critical' : 'attention',
        recommendedAction: `Review recent ${capitalize(category).toLowerCase()} transactions to spot any unusual items.`,
        actionPath:       '/finance',
        generatedAt:      today,
        dataHash,
      });
    } else if (changePct <= -20 && !coveredByBudget) {
      insights.push({
        id:               `finance-mtd-lower-${category}`,
        category:         'finance',
        title:            `Lower ${capitalize(category)} spending this month`,
        explanation:      `You're spending ${Math.abs(changePct)}% less on ${capitalize(category).toLowerCase()} compared to your MTD average for previous months.`,
        supportingMetric: `${formatCurrency(currentSpend, currency)} vs ${formatCurrency(Math.round(histAvg), currency)} avg`,
        comparisonPeriod: `Avg of last ${histSpends.length} months (day 1–${mtd.dayOfMonth})`,
        severity:         'positive',
        generatedAt:      today,
        dataHash,
      });
    }
  }

  // ── 3. Total MTD spending vs prior month same point ────────
  // Only surface when there are no existing attention/critical insights
  // (avoids duplication — the category insights are more specific)
  const hasActionable = insights.some(i => i.severity !== 'positive');

  if (!hasActionable && prevMonths.length > 0) {
    const totalThisMonth = expenses
      .filter(t => t.date >= mtd.start && t.date <= today)
      .reduce((s, t) => s + t.amount, 0);

    if (totalThisMonth > 0) {
      const prev        = prevMonths[0];
      const prevMTDEnd  = historicalMTDEnd(prev.year, prev.month, mtd.dayOfMonth);
      const totalPrev   = expenses
        .filter(t => t.date >= prev.start && t.date <= prevMTDEnd)
        .reduce((s, t) => s + t.amount, 0);

      if (totalPrev > 0) {
        const changePct = Math.round(((totalThisMonth - totalPrev) / totalPrev) * 100);
        if (Math.abs(changePct) >= 20) {
          const dataHash = hashMetrics({
            tRnd: Math.round(totalThisMonth / 500) * 500,
            pRnd: Math.round(totalPrev / 500) * 500,
            mk:   mtd.monthKey,
          });
          insights.push({
            id:               'finance-total-mtd',
            category:         'finance',
            title:            changePct > 0
              ? 'Total spending above last month'
              : 'Total spending below last month',
            explanation:      changePct > 0
              ? `Your total spending so far this month (${formatCurrency(totalThisMonth, currency)}) is ${changePct}% more than the same point last month (${formatCurrency(totalPrev, currency)}).`
              : `Your total spending so far this month (${formatCurrency(totalThisMonth, currency)}) is ${Math.abs(changePct)}% less than the same point last month (${formatCurrency(totalPrev, currency)}).`,
            supportingMetric: formatCurrency(totalThisMonth, currency),
            comparisonPeriod: `vs day ${mtd.dayOfMonth} of last month`,
            severity:         changePct >= 20 ? 'attention' : 'positive',
            actionPath:       '/finance',
            generatedAt:      today,
            dataHash,
          });
        }
      }
    }
  }

  return insights;
}
