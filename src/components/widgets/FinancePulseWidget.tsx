import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { db } from '../../db/database';
import { GlassCard } from '../ui';
import { useSetting } from '../../hooks/useSetting';
import { formatCurrency } from '../../utils/format';
import { startOfMonth, endOfMonth, format as dateFmt, getDate, getDaysInMonth } from 'date-fns';
import { getCategoryLabel, getCategoryEmoji } from '../../modules/finance/FinancePage';

export function FinancePulseWidget() {
  const navigate  = useNavigate();
  const [currency] = useSetting('currency', 'INR');
  const now        = new Date();
  const dayOfMonth  = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const monthStart  = dateFmt(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd    = dateFmt(endOfMonth(now),   'yyyy-MM-dd');
  const today       = dateFmt(now, 'yyyy-MM-dd');

  // ── Current month expenses ───────────────────────────────
  const monthExpenses = useLiveQuery(
    () => db.transactions
      .where('date').between(monthStart, monthEnd, true, true)
      .filter(t => t.type === 'expense')
      .toArray(),
    [monthStart],
    [],
  );

  // ── Last 14 days (week-on-week) ──────────────────────────
  const twoWeeksAgo = dateFmt(new Date(now.getTime() - 14 * 86400000), 'yyyy-MM-dd');
  const thisWeekStart = dateFmt(new Date(now.getTime() - ((now.getDay() || 7) - 1) * 86400000), 'yyyy-MM-dd');
  const lastWeekEnd   = dateFmt(new Date(new Date(thisWeekStart).getTime() - 86400000), 'yyyy-MM-dd');
  const lastWeekStart = dateFmt(new Date(new Date(lastWeekEnd).getTime() - 6 * 86400000), 'yyyy-MM-dd');

  const last14 = useLiveQuery(
    () => db.transactions
      .where('date').between(twoWeeksAgo, today, true, true)
      .filter(t => t.type === 'expense')
      .toArray(),
    [twoWeeksAgo],
    [],
  );

  // ── Budget health ────────────────────────────────────────
  const budgets = useLiveQuery(async () => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return db.budgets
      .where('[year+month+category]')
      .between([y, m, 'a'], [y, m, 'z'], true, true)
      .toArray();
  }, [], []);

  // ── Derived calculations ─────────────────────────────────
  const totalSpent  = (monthExpenses ?? []).reduce((s, t) => s + t.amount, 0);
  const dailyAvg    = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projected   = Math.round(dailyAvg * daysInMonth);
  const pctOfMonth  = Math.round((dayOfMonth / daysInMonth) * 100);

  // Category breakdown for top category
  const catTotals: Record<string, number> = {};
  (monthExpenses ?? []).forEach(t => {
    catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount;
  });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Week-on-week
  const thisWeekSpend = (last14 ?? [])
    .filter(t => t.date >= thisWeekStart && t.date <= today)
    .reduce((s, t) => s + t.amount, 0);
  const lastWeekSpend = (last14 ?? [])
    .filter(t => t.date >= lastWeekStart && t.date <= lastWeekEnd)
    .reduce((s, t) => s + t.amount, 0);
  const weekChange = lastWeekSpend > 0
    ? Math.round(((thisWeekSpend - lastWeekSpend) / lastWeekSpend) * 100)
    : null;

  // Budgets at risk (≥80%)
  const budgetsAtRisk = (budgets ?? []).filter(b => {
    const spent = catTotals[b.category] ?? 0;
    return b.limit > 0 && (spent / b.limit) >= 0.8;
  }).length;

  if (totalSpent === 0 && (budgets ?? []).length === 0) return null;

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/finance')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">
          Finance Pulse
        </p>
        <ArrowRight size={13} className="text-content-muted" />
      </div>

      {/* Main spend + progress bar */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-xl font-bold text-content-primary">{formatCurrency(Math.round(totalSpent), currency)}</p>
            <p className="text-[11px] text-content-muted">spent this month</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-content-secondary">~{formatCurrency(projected, currency)}</p>
            <p className="text-[11px] text-content-muted">projected</p>
          </div>
        </div>

        {/* Month progress bar: spend progress vs time progress */}
        <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
          {/* Time elapsed indicator */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full opacity-20"
            style={{ width: `${pctOfMonth}%`, backgroundColor: '#7c3aed' }}
          />
          {/* Actual spend */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full transition-all"
            style={{
              width: `${Math.min((totalSpent / Math.max(projected, totalSpent)) * 100, 100)}%`,
              backgroundColor: budgetsAtRisk > 0 ? '#f59e0b' : '#7c3aed',
            }}
          />
        </div>
        <p className="text-[10px] text-content-muted mt-1">Day {dayOfMonth} of {daysInMonth}</p>
      </div>

      {/* Stat row */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">

        {/* Week-on-week */}
        {weekChange !== null && (
          <div className="flex items-center gap-1">
            {weekChange > 0
              ? <TrendingUp  size={12} className="text-warning" />
              : <TrendingDown size={12} className="text-success" />
            }
            <span className={`text-[11px] font-medium ${weekChange > 0 ? 'text-warning' : 'text-success'}`}>
              {weekChange > 0 ? '+' : ''}{weekChange}%
            </span>
            <span className="text-[11px] text-content-muted">this week</span>
          </div>
        )}

        {/* Spacer */}
        {weekChange !== null && topCat && <span className="text-content-muted text-[10px]">·</span>}

        {/* Top category */}
        {topCat && (
          <div className="flex items-center gap-1">
            <span className="text-xs">{getCategoryEmoji(topCat)}</span>
            <span className="text-[11px] text-content-muted">{getCategoryLabel(topCat)}</span>
          </div>
        )}

        {/* Budget alert */}
        {budgetsAtRisk > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <AlertTriangle size={11} className="text-warning" />
            <span className="text-[11px] text-warning font-medium">
              {budgetsAtRisk} budget{budgetsAtRisk > 1 ? 's' : ''} at risk
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
