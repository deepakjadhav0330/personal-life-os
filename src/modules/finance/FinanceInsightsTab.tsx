// ─────────────────────────────────────────────────────────────
// Finance Insights Tab
// Four sections:
//   1. Subscriptions & Recurring Bills — what you pay every month
//   2. Upcoming Bills                  — payments due in the next 30 days
//   3. Savings Goal                    — set a target, track YTD progress
//   4. Income Overview                 — trend, source breakdown, YTD total
// All computed locally from existing transactions. No new DB tables.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  format as dateFmt, parseISO, addDays, addWeeks, addMonths, addYears,
  differenceInDays, startOfMonth, endOfMonth, subMonths, getYear,
} from 'date-fns';
import { db } from '../../db/database';
import { GlassCard, Button, EmptyState, Input, ProgressBar } from '../../components/ui';
import { useSetting } from '../../hooks/useSetting';
import { formatCurrency } from '../../utils/format';
import { getCategoryEmoji, getCategoryLabel, CATEGORY_COLORS } from './FinancePage';
import {
  RepeatIcon, Calendar, Target, TrendingUp, TrendingDown,
  Minus, AlertCircle, CheckCircle2, Edit3, Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────

function nextPaymentDate(lastDate: string, freq?: string): Date {
  const d = parseISO(lastDate);
  switch (freq) {
    case 'daily':   return addDays(d, 1);
    case 'weekly':  return addWeeks(d, 1);
    case 'monthly': return addMonths(d, 1);
    case 'yearly':  return addYears(d, 1);
    default:        return addMonths(d, 1);
  }
}

function monthlyEquivalent(amount: number, freq?: string): number {
  switch (freq) {
    case 'daily':   return Math.round(amount * 365 / 12);
    case 'weekly':  return Math.round(amount * 52 / 12);
    case 'monthly': return amount;
    case 'yearly':  return Math.round(amount / 12);
    default:        return amount;
  }
}

function freqLabel(freq?: string): string {
  const map: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
  };
  return map[freq ?? ''] ?? 'Monthly';
}

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-elevated rounded-input px-3 py-2 text-xs">
      <p className="text-content-muted mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill ?? p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─── Main tab ─────────────────────────────────────────────────

export function FinanceInsightsTab() {
  return (
    <div className="flex flex-col gap-4">
      <SubscriptionsSection />
      <UpcomingBillsSection />
      <SavingsGoalSection />
      <IncomeOverviewSection />
    </div>
  );
}

// ─── 1. Subscriptions & Recurring ────────────────────────────

function SubscriptionsSection() {
  const [currency] = useSetting('currency', 'INR');
  const today      = dateFmt(new Date(), 'yyyy-MM-dd');

  // Parent recurring expenses — the "subscription" records
  const parents = useLiveQuery(
    () => db.transactions
      .filter(t => !!t.isRecurring && !t.recurringParentId && t.type === 'expense')
      .toArray(),
    [], [],
  );

  // For each parent, find its most recent child (or itself)
  const enriched = useLiveQuery(async () => {
    if (!parents?.length) return [];
    return Promise.all(parents.map(async parent => {
      const allChildren = await db.transactions
        .filter(t => t.recurringParentId === parent.id && !t.isRecurring)
        .sortBy('date');
      const lastOccurrence = allChildren.length > 0
        ? allChildren[allChildren.length - 1]
        : parent;
      const nextDate = nextPaymentDate(lastOccurrence.date, parent.recurringFrequency);
      const daysUntil = differenceInDays(nextDate, parseISO(today));
      return {
        ...parent,
        lastDate:   lastOccurrence.date,
        nextDate:   dateFmt(nextDate, 'yyyy-MM-dd'),
        daysUntil,
        monthly:    monthlyEquivalent(parent.amount, parent.recurringFrequency),
      };
    }));
  }, [parents?.map(p => p.id).join(','), today], []);

  const totalMonthly = (enriched ?? []).reduce((s, e) => s + e.monthly, 0);

  if (!(enriched ?? []).length) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <RepeatIcon size={13} className="text-accent" />
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">Subscriptions & Recurring</p>
        </div>
        <EmptyState
          icon={<RepeatIcon size={20} />}
          title="No recurring expenses"
          subtitle="Mark a transaction as recurring when adding it to track subscriptions here."
          compact
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <RepeatIcon size={13} className="text-accent" />
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">Subscriptions & Recurring</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-content-primary">{formatCurrency(totalMonthly, currency)}</p>
          <p className="text-[10px] text-content-muted">/ month total</p>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {(enriched ?? [])
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .map(item => {
            const isOverdue  = item.daysUntil < 0;
            const isDueSoon  = item.daysUntil >= 0 && item.daysUntil <= 5;
            const statusColor = isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#a0a0c0';

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Category icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm"
                  style={{ backgroundColor: `${CATEGORY_COLORS[item.category] ?? '#94a3b8'}22` }}
                >
                  {getCategoryEmoji(item.category)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {item.description || getCategoryLabel(item.category)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-content-muted">{freqLabel(item.recurringFrequency)}</span>
                    <span className="text-[10px] text-content-muted">·</span>
                    <span className="text-[10px]" style={{ color: statusColor }}>
                      {isOverdue
                        ? `Overdue by ${Math.abs(item.daysUntil)}d`
                        : item.daysUntil === 0
                          ? 'Due today'
                          : `Due in ${item.daysUntil}d`}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-content-primary">{formatCurrency(item.amount, currency)}</p>
                  {item.recurringFrequency !== 'monthly' && (
                    <p className="text-[10px] text-content-muted">≈ {formatCurrency(item.monthly, currency)}/mo</p>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer note */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-[11px] text-content-muted">
          Mark transactions as recurring when adding them to track subscriptions here.
        </p>
      </div>
    </GlassCard>
  );
}

// ─── 2. Upcoming Bills ────────────────────────────────────────

function UpcomingBillsSection() {
  const [currency] = useSetting('currency', 'INR');
  const today      = dateFmt(new Date(), 'yyyy-MM-dd');
  const in30days   = dateFmt(addDays(new Date(), 30), 'yyyy-MM-dd');

  const parents = useLiveQuery(
    () => db.transactions
      .filter(t => !!t.isRecurring && !t.recurringParentId && t.type === 'expense')
      .toArray(),
    [], [],
  );

  const upcoming = useLiveQuery(async () => {
    if (!parents?.length) return [];
    const results = await Promise.all(parents.map(async parent => {
      const allChildren = await db.transactions
        .filter(t => t.recurringParentId === parent.id && !t.isRecurring)
        .sortBy('date');
      const lastOccurrence = allChildren.length > 0 ? allChildren[allChildren.length - 1] : parent;
      const nextDate = nextPaymentDate(lastOccurrence.date, parent.recurringFrequency);
      const nextStr  = dateFmt(nextDate, 'yyyy-MM-dd');
      return { ...parent, nextDate: nextStr, daysUntil: differenceInDays(nextDate, parseISO(today)) };
    }));
    // Only show bills due within 30 days (including overdue up to 7 days)
    return results
      .filter(r => r.daysUntil >= -7 && r.nextDate <= in30days)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [parents?.map(p => p.id).join(','), today], []);

  if (!(upcoming ?? []).length) return null;

  return (
    <GlassCard padding="none">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <Calendar size={13} className="text-accent" />
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">Upcoming Bills (30 days)</p>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.04]">
        {(upcoming ?? []).map(item => {
          const isOverdue = item.daysUntil < 0;
          const isDueSoon = item.daysUntil >= 0 && item.daysUntil <= 3;

          return (
            <div key={`upcoming-${item.id}`} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-shrink-0">
                {isOverdue
                  ? <AlertCircle size={15} className="text-danger" />
                  : isDueSoon
                    ? <AlertCircle size={15} className="text-warning" />
                    : <Calendar size={15} className="text-content-muted" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate">
                  {item.description || getCategoryLabel(item.category)}
                </p>
                <p className={`text-[11px] ${isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-content-muted'}`}>
                  {isOverdue
                    ? `Overdue by ${Math.abs(item.daysUntil)} days`
                    : item.daysUntil === 0
                      ? 'Due today'
                      : `Due ${dateFmt(parseISO(item.nextDate), 'dd MMM')}`}
                </p>
              </div>
              <p className="text-sm font-semibold text-content-primary shrink-0">
                {formatCurrency(item.amount, currency)}
              </p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── 3. Savings Goal ─────────────────────────────────────────

interface SavingsGoal { amount: number; year: number }

function SavingsGoalSection() {
  const [currency] = useSetting('currency', 'INR');
  const currentYear = getYear(new Date());
  const [goal, setGoal] = useSetting<SavingsGoal>('savingsGoal', { amount: 0, year: currentYear });
  const [editing,    setEditing]    = useState(false);
  const [inputValue, setInputValue] = useState('');

  // YTD income & expenses for the goal year
  const yearStart = `${goal.year}-01-01`;
  const yearEnd   = `${goal.year}-12-31`;

  const yearData = useLiveQuery(async () => {
    const txns = await db.transactions
      .where('date').between(yearStart, yearEnd, true, true)
      .toArray();

    const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Month-by-month savings for the chart (Jan–current month)
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(goal.year, i, 1);
      const start = dateFmt(startOfMonth(d), 'yyyy-MM-dd');
      const end   = dateFmt(endOfMonth(d),   'yyyy-MM-dd');
      const monthTxns = txns.filter(t => t.date >= start && t.date <= end);
      const inc  = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp  = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        month: dateFmt(d, 'MMM'),
        savings: Math.max(inc - exp, 0),
        future:  d > now,
      };
    }).filter(m => !m.future || m.savings > 0);

    return { income, expenses, savings: income - expenses, months };
  }, [yearStart, yearEnd, goal.year], null);

  const netSavings = yearData?.savings ?? 0;
  const progressPct = goal.amount > 0
    ? Math.min(Math.round((netSavings / goal.amount) * 100), 100)
    : 0;

  const remaining = goal.amount - netSavings;
  const monthsLeft = 12 - new Date().getMonth(); // months remaining in year
  const neededPerMonth = goal.amount > 0 && remaining > 0 && monthsLeft > 0
    ? Math.round(remaining / monthsLeft)
    : null;

  const saveGoal = async () => {
    const amount = parseFloat(inputValue.replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      await setGoal({ amount, year: currentYear });
    }
    setEditing(false);
  };

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={13} className="text-accent" />
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">
            Savings Goal {goal.year}
          </p>
        </div>
        <button
          onClick={() => { setInputValue(goal.amount > 0 ? String(goal.amount) : ''); setEditing(v => !v); }}
          className="text-[11px] text-accent hover:underline flex items-center gap-1"
        >
          <Edit3 size={11} />
          {goal.amount > 0 ? 'Edit' : 'Set goal'}
        </button>
      </div>

      {/* Goal editor */}
      {editing && (
        <div className="flex gap-2 mb-3">
          <Input
            label=""
            type="number"
            inputMode="decimal"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="e.g. 100000"
            autoFocus
            className="flex-1"
          />
          <Button variant="primary" size="sm" onClick={saveGoal}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      )}

      {goal.amount === 0 ? (
        <EmptyState
          icon={<Target size={20} />}
          title="No savings goal set"
          subtitle={`Set an annual savings target for ${currentYear} to track your progress.`}
          compact
        />
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-content-primary">{formatCurrency(Math.max(netSavings, 0), currency)}</p>
              <p className="text-[11px] text-content-muted">saved so far</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-content-secondary">{formatCurrency(goal.amount, currency)}</p>
              <p className="text-[10px] text-content-muted">goal</p>
            </div>
          </div>

          <ProgressBar
            value={progressPct}
            color={progressPct >= 100 ? 'success' : progressPct >= 60 ? 'accent' : 'warning'}
          />

          <div className="flex items-center justify-between mt-1 mb-3">
            <p className="text-[11px] text-content-muted">{progressPct}% complete</p>
            {remaining > 0 && (
              <p className="text-[11px] text-content-muted">{formatCurrency(remaining, currency)} to go</p>
            )}
            {progressPct >= 100 && (
              <div className="flex items-center gap-1 text-success text-[11px]">
                <CheckCircle2 size={12} />
                Goal reached!
              </div>
            )}
          </div>

          {/* Monthly needed */}
          {neededPerMonth && neededPerMonth > 0 && (
            <div className="glass-1 rounded-input px-3 py-2 mb-3 flex items-center gap-2">
              <Zap size={12} className="text-accent shrink-0" />
              <p className="text-[11px] text-content-secondary">
                Save <strong className="text-content-primary">{formatCurrency(neededPerMonth, currency)}/month</strong> for the next {monthsLeft} month{monthsLeft > 1 ? 's' : ''} to hit your goal.
              </p>
            </div>
          )}

          {/* Monthly savings chart */}
          {(yearData?.months ?? []).some(m => m.savings > 0) && (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={yearData?.months ?? []} barSize={18}>
                <XAxis dataKey="month" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="savings" name="Saved" radius={[3, 3, 0, 0]}>
                  {(yearData?.months ?? []).map((m, i) => (
                    <Cell key={i} fill={m.savings >= (neededPerMonth ?? 0) ? '#22c55e' : '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </GlassCard>
  );
}

// ─── 4. Income Overview ───────────────────────────────────────

function IncomeOverviewSection() {
  const [currency] = useSetting('currency', 'INR');
  const now        = new Date();

  // 6 months of income data
  const monthlyIncome = useLiveQuery(async () => {
    return Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d     = subMonths(now, 5 - i);
        const start = dateFmt(startOfMonth(d), 'yyyy-MM-dd');
        const end   = dateFmt(endOfMonth(d),   'yyyy-MM-dd');
        return db.transactions
          .where('date').between(start, end, true, true)
          .filter(t => t.type === 'income')
          .toArray()
          .then(txns => ({
            month:  dateFmt(d, 'MMM'),
            total:  txns.reduce((s, t) => s + t.amount, 0),
            txns,
          }));
      }),
    );
  }, [], []);

  // YTD income
  const yearStart = `${now.getFullYear()}-01-01`;
  const ytdIncome = useLiveQuery(async () => {
    const txns = await db.transactions
      .where('date').between(yearStart, dateFmt(now, 'yyyy-MM-dd'), true, true)
      .filter(t => t.type === 'income')
      .toArray();
    return txns.reduce((s, t) => s + t.amount, 0);
  }, [yearStart], 0);

  // Income by source (last 3 months)
  const threeMonthsAgo = dateFmt(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd');
  const incomeBySource = useLiveQuery(async () => {
    const txns = await db.transactions
      .where('date').between(threeMonthsAgo, dateFmt(now, 'yyyy-MM-dd'), true, true)
      .filter(t => t.type === 'income')
      .toArray();
    const bySource: Record<string, number> = {};
    txns.forEach(t => { bySource[t.category] = (bySource[t.category] ?? 0) + t.amount; });
    return Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  }, [threeMonthsAgo], []);

  const hasIncome = (monthlyIncome ?? []).some(m => m.total > 0);
  if (!hasIncome) return null;

  // 3-month average and trend
  const last3  = (monthlyIncome ?? []).slice(3).map(m => m.total).filter(v => v > 0);
  const avg3   = last3.length > 0 ? Math.round(last3.reduce((s, v) => s + v, 0) / last3.length) : 0;
  const latest = (monthlyIncome ?? []).at(-1)?.total ?? 0;
  const prev   = (monthlyIncome ?? []).at(-2)?.total ?? 0;
  const momChange = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : null;

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={13} className="text-accent" />
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">Income Overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-success">{formatCurrency(ytdIncome ?? 0, currency)}</p>
          <p className="text-[10px] text-content-muted">YTD {now.getFullYear()}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-1 rounded-input p-3">
          <p className="text-xs text-content-muted">3-month avg</p>
          <p className="text-sm font-bold text-content-primary mt-0.5">{formatCurrency(avg3, currency)}</p>
        </div>
        <div className="glass-1 rounded-input p-3">
          <p className="text-xs text-content-muted">vs last month</p>
          <div className="flex items-center gap-1 mt-0.5">
            {momChange !== null
              ? <>
                  {momChange > 0
                    ? <TrendingUp  size={13} className="text-success" />
                    : momChange < 0
                      ? <TrendingDown size={13} className="text-danger" />
                      : <Minus size={13} className="text-content-muted" />
                  }
                  <p className={`text-sm font-bold ${momChange > 0 ? 'text-success' : momChange < 0 ? 'text-danger' : 'text-content-muted'}`}>
                    {momChange > 0 ? '+' : ''}{momChange}%
                  </p>
                </>
              : <p className="text-sm text-content-muted">—</p>
            }
          </div>
        </div>
      </div>

      {/* 6-month income chart */}
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={monthlyIncome ?? []} barSize={22}>
          <XAxis dataKey="month" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<GlassTooltip />} />
          <Bar dataKey="total" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Income by source */}
      {(incomeBySource ?? []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-content-muted mb-2">By source (last 3 months)</p>
          <div className="flex flex-col gap-1.5">
            {(incomeBySource ?? []).map(([cat, amt]) => {
              const totalIncome = (incomeBySource ?? []).reduce((s, [, v]) => s + v, 0);
              const pct = totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-sm">{getCategoryEmoji(cat)}</span>
                  <span className="text-xs text-content-secondary flex-1">{getCategoryLabel(cat)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-content-primary font-medium w-14 text-right">
                      {formatCurrency(Math.round(amt), currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
