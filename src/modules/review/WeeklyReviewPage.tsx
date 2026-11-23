/**
 * Weekly Review & Monthly Report
 * Cross-module reflection and reporting page.
 * No new DB tables — weekly reviews are stored as JournalEntry
 * with type 'weekly-review', invisible to the main Journal page.
 */
import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  format, parseISO, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, getYear, getMonth,
  differenceInDays,
} from 'date-fns';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, Textarea } from '../../components/ui';
import { useSetting } from '../../hooks/useSetting';
import { formatCurrency, formatMinutes } from '../../utils/format';
import { toast } from '../../stores/useToastStore';
import type { JournalMood } from '../../db/schema';
import {
  ChevronLeft, ChevronRight, Flame, CheckSquare, DollarSign,
  Dumbbell, GraduationCap, Target, TrendingUp, TrendingDown,
  Minus, Share2, Copy, Check, CalendarCheck2, BarChart2,
} from 'lucide-react';

// ─── Shared helpers ───────────────────────────────────────────

const MOODS: { key: JournalMood; emoji: string; label: string }[] = [
  { key: 'great',    emoji: '😄', label: 'Great' },
  { key: 'good',     emoji: '😊', label: 'Good' },
  { key: 'okay',     emoji: '😐', label: 'Okay' },
  { key: 'bad',      emoji: '😔', label: 'Bad' },
  { key: 'terrible', emoji: '😞', label: 'Terrible' },
];

function weekLabel(start: string): string {
  const s = parseISO(start);
  const e = endOfWeek(s, { weekStartsOn: 1 });
  if (format(s, 'MMM') === format(e, 'MMM')) {
    return `${format(s, 'MMM d')} – ${format(e, 'd')}`;
  }
  return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
}

function weekChangeLabel(current: number, prev: number): { pct: number; dir: 'up' | 'down' | 'same' } {
  if (prev === 0) return { pct: 0, dir: 'same' };
  const pct = Math.round(((current - prev) / prev) * 100);
  return { pct: Math.abs(pct), dir: pct > 2 ? 'up' : pct < -2 ? 'down' : 'same' };
}

// ─── Main page ────────────────────────────────────────────────

export function WeeklyReviewPage() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Review" subtitle="Weekly reflection & monthly reports" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs
          tabs={[
            { id: 'weekly',  label: 'Weekly',  icon: <CalendarCheck2 size={12} /> },
            { id: 'monthly', label: 'Monthly', icon: <BarChart2 size={12} /> },
          ]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as 'weekly' | 'monthly')}
        />
        {activeTab === 'weekly'  && <WeeklyTab />}
        {activeTab === 'monthly' && <MonthlyTab />}
      </div>
    </div>
  );
}

// ─── Weekly Tab ───────────────────────────────────────────────

function WeeklyTab() {
  const now      = new Date();
  const thisWeekStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  void thisWeekStr;  // used as a navigation anchor
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const selectedWeekStart = format(
    startOfWeek(subWeeks(now, weekOffset), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  );
  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 glass-1 rounded-input text-content-muted hover:text-content-primary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-content-primary">{weekLabel(selectedWeekStart)}</p>
          {isCurrentWeek && (
            <p className="text-[11px] text-accent mt-0.5">This week</p>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
          disabled={isCurrentWeek}
          className="p-2 glass-1 rounded-input text-content-muted hover:text-content-primary transition-colors disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Stats + reflection */}
      <WeekStats weekStart={selectedWeekStart} />

      {/* Past reviews */}
      {isCurrentWeek && <PastReviews />}
    </div>
  );
}

// ─── Week Stats ───────────────────────────────────────────────

function WeekStats({ weekStart }: { weekStart: string }) {
  const [currency] = useSetting('currency', 'INR');
  const now        = new Date();
  const today      = format(now, 'yyyy-MM-dd');
  const weekEnd    = format(endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevWeekStart = format(subWeeks(parseISO(weekStart), 1), 'yyyy-MM-dd');
  const prevWeekEnd   = format(endOfWeek(subWeeks(parseISO(weekStart), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  // Don't query beyond today for the current week
  const effectiveEnd = weekEnd > today ? today : weekEnd;

  const stats = useLiveQuery(async () => {
    const [
      activeHabits, habitComps,
      allTasks,
      thisWeekExpenses, prevWeekExpenses,
      workouts,
      milestones,
      learningSessions,
    ] = await Promise.all([
      db.habits.filter(h => !!h.isActive).toArray(),
      db.habitCompletions.where('date').between(weekStart, effectiveEnd, true, true).toArray(),
      db.tasks.toArray(),
      db.transactions.where('date').between(weekStart, effectiveEnd, true, true).filter(t => t.type === 'expense').toArray(),
      db.transactions.where('date').between(prevWeekStart, prevWeekEnd, true, true).filter(t => t.type === 'expense').toArray(),
      db.workouts.where('date').between(weekStart, effectiveEnd, true, true).filter(w => w.status === 'completed').count(),
      db.milestones.filter(m => m.status === 'completed' && !!m.completedAt && m.completedAt.slice(0, 10) >= weekStart && m.completedAt.slice(0, 10) <= effectiveEnd).count(),
      db.learningSessions.where('date').between(weekStart, effectiveEnd, true, true).toArray(),
    ]);

    const daysElapsed = Math.min(
      differenceInDays(parseISO(effectiveEnd), parseISO(weekStart)) + 1, 7,
    );
    const totalScheduled = activeHabits.length * daysElapsed;
    const habitRate = totalScheduled > 0
      ? Math.round((habitComps.length / totalScheduled) * 100) : 0;

    const tasksCompleted = allTasks.filter(
      t => t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) >= weekStart && t.completedAt.slice(0, 10) <= effectiveEnd,
    ).length;
    const tasksOverdue = allTasks.filter(
      t => t.status === 'pending' && t.dueDate && t.dueDate < today,
    ).length;

    const financeThis = thisWeekExpenses.reduce((s, t) => s + t.amount, 0);
    const financePrev = prevWeekExpenses.reduce((s, t) => s + t.amount, 0);
    const learningMins = learningSessions.reduce((s, l) => s + l.durationMinutes, 0);

    return {
      habitRate, activeHabits: activeHabits.length,
      tasksCompleted, tasksOverdue,
      financeThis, financePrev,
      workouts, milestones, learningMins,
      daysElapsed,
    };
  }, [weekStart, effectiveEnd], null);

  // Check if a review already exists for this week
  const existingReview = useLiveQuery(
    () => db.journalEntries
      .where('type').equals('weekly-review' as any)
      .filter(e => e.date === weekStart)
      .first(),
    [weekStart],
    undefined,
  );

  if (!stats) {
    return (
      <GlassCard className="animate-pulse">
        <div className="h-32 flex items-center justify-center">
          <p className="text-sm text-content-muted">Loading…</p>
        </div>
      </GlassCard>
    );
  }

  const financeChange = weekChangeLabel(stats.financeThis, stats.financePrev);

  return (
    <>
      {/* This Week at a Glance */}
      <GlassCard padding="none">
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">
            {weekLabel(weekStart)} at a Glance
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.04]">
          {/* Habits */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Flame size={15} className="text-warning shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">{stats.habitRate}%</p>
              <p className="text-[11px] text-content-muted">Habits · {stats.activeHabits} active</p>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex items-center gap-3 px-4 py-3">
            <CheckSquare size={15} className="text-accent shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">{stats.tasksCompleted} done</p>
              <p className="text-[11px] text-content-muted">
                {stats.tasksOverdue > 0 ? `${stats.tasksOverdue} overdue` : 'No overdue'}
              </p>
            </div>
          </div>

          {/* Finance */}
          <div className="flex items-center gap-3 px-4 py-3">
            <DollarSign size={15} className="text-success shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">
                {formatCurrency(Math.round(stats.financeThis), currency)}
              </p>
              <div className="flex items-center gap-1">
                {financeChange.dir === 'up' && <TrendingUp size={10} className="text-warning" />}
                {financeChange.dir === 'down' && <TrendingDown size={10} className="text-success" />}
                {financeChange.dir === 'same' && <Minus size={10} className="text-content-muted" />}
                <p className="text-[11px] text-content-muted">
                  {financeChange.dir !== 'same'
                    ? `${financeChange.pct}% ${financeChange.dir === 'up' ? '↑' : '↓'} vs last wk`
                    : 'vs last week'}
                </p>
              </div>
            </div>
          </div>

          {/* Fitness */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Dumbbell size={15} className="text-danger shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">{stats.workouts} workout{stats.workouts !== 1 ? 's' : ''}</p>
              <p className="text-[11px] text-content-muted">this week</p>
            </div>
          </div>

          {/* Goals */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Target size={15} className="text-violet-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">{stats.milestones} milestone{stats.milestones !== 1 ? 's' : ''}</p>
              <p className="text-[11px] text-content-muted">completed</p>
            </div>
          </div>

          {/* Learning */}
          <div className="flex items-center gap-3 px-4 py-3">
            <GraduationCap size={15} className="text-info shrink-0" />
            <div>
              <p className="text-sm font-bold text-content-primary">
                {stats.learningMins > 0 ? formatMinutes(stats.learningMins) : '0 min'}
              </p>
              <p className="text-[11px] text-content-muted">learning time</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Reflection form or saved review */}
      {existingReview !== undefined && (
        existingReview
          ? <SavedReview review={existingReview} weekStart={weekStart} />
          : <ReflectionForm
              weekStart={weekStart}
              statsSnapshot={stats}
            />
      )}
    </>
  );
}

// ─── Reflection Form ──────────────────────────────────────────

interface StatsSnapshot {
  habitRate: number;
  tasksCompleted: number;
  financeThis: number;
  workouts: number;
  learningMins: number;
}

function ReflectionForm({
  weekStart,
  statsSnapshot,
}: {
  weekStart: string;
  statsSnapshot: StatsSnapshot;
}) {
  const [wentWell,   setWentWell]   = useState('');
  const [improved,   setImproved]   = useState('');
  const [learned,    setLearned]    = useState('');
  const [focus,      setFocus]      = useState('');
  const [mood,       setMood]       = useState<JournalMood | null>(null);
  const [saving,     setSaving]     = useState(false);

  const saveReview = async () => {
    if (!wentWell.trim() && !improved.trim() && !learned.trim() && !focus.trim()) {
      toast.error('Write something in at least one field before saving.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await db.journalEntries.add({
        date: weekStart,
        type: 'weekly-review' as any,
        mood: mood ?? undefined,
        templateAnswers: {
          wentWell:        wentWell.trim(),
          improved:        improved.trim(),
          learned:         learned.trim(),
          tomorrowPriority: focus.trim(),
        },
        freeText: JSON.stringify({
          habitRate:     statsSnapshot.habitRate,
          tasksCompleted: statsSnapshot.tasksCompleted,
          financeThis:   statsSnapshot.financeThis,
          workouts:      statsSnapshot.workouts,
          learningMins:  statsSnapshot.learningMins,
        }),
        wordCount: [wentWell, improved, learned, focus].join(' ').trim().split(/\s+/).filter(Boolean).length,
        createdAt: now,
        updatedAt: now,
      });
      toast.success('Review saved!');
    } catch {
      toast.error('Could not save review — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard>
      <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-4">
        Your Reflection
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-content-secondary mb-1.5">🌟 What went well this week?</p>
          <Textarea
            value={wentWell}
            onChange={e => setWentWell(e.target.value)}
            placeholder="Wins, progress, things you're proud of…"
            rows={2}
          />
        </div>

        <div>
          <p className="text-xs text-content-secondary mb-1.5">🔧 What could have been better?</p>
          <Textarea
            value={improved}
            onChange={e => setImproved(e.target.value)}
            placeholder="Missed targets, friction, areas to improve…"
            rows={2}
          />
        </div>

        <div>
          <p className="text-xs text-content-secondary mb-1.5">💡 Key insight or learning</p>
          <Textarea
            value={learned}
            onChange={e => setLearned(e.target.value)}
            placeholder="Something you realised, a pattern you noticed…"
            rows={2}
          />
        </div>

        <div>
          <p className="text-xs text-content-secondary mb-1.5">🎯 Focus for next week</p>
          <Textarea
            value={focus}
            onChange={e => setFocus(e.target.value)}
            placeholder="One or two priorities for the coming week…"
            rows={2}
          />
        </div>

        {/* Mood */}
        <div>
          <p className="text-xs text-content-secondary mb-2">How was this week overall?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-input transition-all ${
                  mood === m.key ? 'glass-2 ring-1 ring-accent/40' : 'glass-1'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-[9px] text-content-muted">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={saveReview}
          loading={saving}
          fullWidth
        >
          Save Review
        </Button>
      </div>
    </GlassCard>
  );
}

// ─── Saved Review ─────────────────────────────────────────────

function SavedReview({ review, weekStart }: { review: any; weekStart: string }) {
  const [editing, setEditing] = useState(false);
  const moodObj = MOODS.find(m => m.key === review.mood);

  if (editing) {
    return (
      <ReflectionForm
        weekStart={weekStart}
        statsSnapshot={JSON.parse(review.freeText ?? '{}')}
      />
    );
  }

  const answers = review.templateAnswers ?? {};
  const items = [
    { label: '🌟 What went well', value: answers.wentWell },
    { label: '🔧 Could be better', value: answers.improved },
    { label: '💡 Key insight', value: answers.learned },
    { label: '🎯 Focus next week', value: answers.tomorrowPriority },
  ].filter(i => i.value);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest">
            Your Reflection
          </p>
          {moodObj && <span className="text-base">{moodObj.emoji}</span>}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] text-accent hover:underline"
        >
          Edit
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.label}>
            <p className="text-[11px] text-content-muted mb-1">{item.label}</p>
            <p className="text-sm text-content-secondary leading-relaxed">{item.value}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-content-muted text-center py-2">No reflection saved for this week.</p>
        )}
      </div>
    </GlassCard>
  );
}

// ─── Past Reviews ─────────────────────────────────────────────

function PastReviews() {
  const [expanded, setExpanded] = useState(false);

  const reviews = useLiveQuery(
    () => db.journalEntries
      .where('type').equals('weekly-review' as any)
      .reverse().sortBy('date')
      .then(r => r.slice(0, 8)),
    [], [],
  );

  if (!(reviews ?? []).length) return null;

  const display = expanded ? (reviews ?? []) : (reviews ?? []).slice(0, 3);

  return (
    <GlassCard>
      <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
        Past Reviews
      </p>
      <div className="flex flex-col gap-2">
        {display.map(r => {
          const stats = JSON.parse(r.freeText ?? '{}') as Partial<StatsSnapshot>;
          const moodObj = MOODS.find(m => m.key === r.mood);
          const wl = weekLabel(r.date);
          return (
            <div key={r.id} className="flex items-center gap-3 glass-1 rounded-input px-3 py-2.5">
              <span className="text-base">{moodObj?.emoji ?? '😐'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary">{wl}</p>
                <p className="text-[11px] text-content-muted">
                  Habits {stats.habitRate ?? '?'}% · {stats.tasksCompleted ?? '?'} tasks · {stats.workouts ?? '?'} workouts
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {(reviews ?? []).length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 w-full text-xs text-content-muted hover:text-content-secondary text-center py-1 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${(reviews?.length ?? 0) - 3} more`}
        </button>
      )}
    </GlassCard>
  );
}

// ─── Monthly Tab ──────────────────────────────────────────────

function MonthlyTab() {
  const [currency] = useSetting('currency', 'INR');
  const now = new Date();
  // Default to last complete month
  const [monthOffset, setMonthOffset] = useState(1);
  const targetDate = subMonths(now, monthOffset);
  const selectedMonth = format(targetDate, 'yyyy-MM');
  void selectedMonth; // used for the monthly report key but not in JSX directly
  const monthLabel   = format(targetDate, 'MMMM yyyy');
  const monthStart   = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const monthEnd     = format(endOfMonth(targetDate),   'yyyy-MM-dd');
  const isCurrentMonth = monthOffset === 0;

  const stats = useLiveQuery(async () => {
    const y = getYear(targetDate);
    const m = getMonth(targetDate) + 1;

    const [
      txns, budgets, activeHabits, habitComps,
      allTasks, workouts, milestones, learningSessions, learningItems,
    ] = await Promise.all([
      db.transactions.where('date').between(monthStart, monthEnd, true, true).toArray(),
      db.budgets.where('[year+month+category]').between([y, m, 'a'], [y, m, 'z'], true, true).toArray(),
      db.habits.filter(h => !!h.isActive).toArray(),
      db.habitCompletions.where('date').between(monthStart, monthEnd, true, true).toArray(),
      db.tasks.toArray(),
      db.workouts.where('date').between(monthStart, monthEnd, true, true).filter(w => w.status === 'completed').count(),
      db.milestones.filter(m2 => m2.status === 'completed' && !!m2.completedAt && m2.completedAt.slice(0, 10) >= monthStart && m2.completedAt.slice(0, 10) <= monthEnd).count(),
      db.learningSessions.where('date').between(monthStart, monthEnd, true, true).toArray(),
      db.learningItems.filter(i => i.status === 'completed' && !!i.updatedAt && i.updatedAt.slice(0, 10) >= monthStart && i.updatedAt.slice(0, 10) <= monthEnd).count(),
    ]);

    const totalExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalIncome   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    // Budget health
    const spendByCat: Record<string, number> = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      spendByCat[t.category] = (spendByCat[t.category] ?? 0) + t.amount;
    });
    const budgetsOver = budgets.filter(b => (spendByCat[b.category] ?? 0) > b.limit).length;

    // Habit completion rate
    const daysInMonth = differenceInDays(parseISO(monthEnd), parseISO(monthStart)) + 1;
    const habitRate = activeHabits.length > 0
      ? Math.round((habitComps.length / (activeHabits.length * daysInMonth)) * 100)
      : 0;

    // Tasks
    const tasksCompletedMonth = allTasks.filter(
      t => t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) >= monthStart && t.completedAt.slice(0, 10) <= monthEnd,
    ).length;
    const tasksDueMonth = allTasks.filter(
      t => t.dueDate && t.dueDate >= monthStart && t.dueDate <= monthEnd,
    ).length;

    const learningMins = learningSessions.reduce((s, l) => s + l.durationMinutes, 0);

    return {
      totalExpenses, totalIncome, savings: totalIncome - totalExpenses,
      budgets: budgets.length, budgetsOver,
      habitRate, activeHabits: activeHabits.length,
      tasksCompleted: tasksCompletedMonth, tasksDue: tasksDueMonth,
      workouts, milestones, learningMins, learningItems,
    };
  }, [monthStart, monthEnd], null);

  const [copied, setCopied] = useState(false);

  const shareReport = useCallback(async () => {
    if (!stats) return;
    const taskPct = stats.tasksDue > 0 ? Math.round((stats.tasksCompleted / stats.tasksDue) * 100) : 0;
    const lines = [
      `Life OS — Monthly Report: ${monthLabel}`,
      '',
      `💰 Finance`,
      `  Total spending:  ${formatCurrency(Math.round(stats.totalExpenses), currency)}`,
      `  Total income:    ${formatCurrency(Math.round(stats.totalIncome), currency)}`,
      `  Net savings:     ${formatCurrency(Math.round(stats.savings), currency)}`,
      stats.budgetsOver > 0 ? `  Budgets exceeded: ${stats.budgetsOver}` : `  All budgets healthy`,
      '',
      `✅ Habits`,
      `  Completion rate: ${stats.habitRate}% (${stats.activeHabits} active habits)`,
      '',
      `📋 Tasks`,
      `  Completed: ${stats.tasksCompleted} of ${stats.tasksDue} (${taskPct}%)`,
      '',
      `💪 Fitness`,
      `  Workouts: ${stats.workouts}`,
      `  Goal milestones: ${stats.milestones} completed`,
      '',
      `📚 Learning`,
      `  Time invested: ${formatMinutes(stats.learningMins)}`,
      stats.learningItems > 0 ? `  Items completed: ${stats.learningItems}` : '',
    ].filter(l => l !== '').join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy — try using the Share button');
    }
  }, [stats, monthLabel, currency]);

  const shareNative = useCallback(async () => {
    if (!stats) return;
    try { await navigator.share({ text: `My ${monthLabel} report from Life OS`, title: 'Monthly Report' }); } catch { /* user cancelled */ }
  }, [stats, monthLabel]);

  return (
    <div className="flex flex-col gap-3">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="p-2 glass-1 rounded-input text-content-muted hover:text-content-primary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-content-primary">{monthLabel}</p>
          {isCurrentMonth && <p className="text-[11px] text-warning mt-0.5">Month in progress</p>}
        </div>
        <button
          onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="p-2 glass-1 rounded-input text-content-muted hover:text-content-primary transition-colors disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {!stats ? (
        <GlassCard className="animate-pulse">
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-content-muted">Loading…</p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<DollarSign size={14} className="text-success" />} label="Spending" value={formatCurrency(Math.round(stats.totalExpenses), currency)} sub={stats.savings >= 0 ? `Saved ${formatCurrency(Math.round(stats.savings), currency)}` : `Deficit ${formatCurrency(Math.round(Math.abs(stats.savings)), currency)}`} subColor={stats.savings >= 0 ? 'text-success' : 'text-danger'} />
            <StatCard icon={<Flame size={14} className="text-warning" />} label="Habits" value={`${stats.habitRate}%`} sub={`${stats.activeHabits} habits`} />
            <StatCard icon={<CheckSquare size={14} className="text-accent" />} label="Tasks" value={`${stats.tasksCompleted}`} sub={`of ${stats.tasksDue} due`} />
            <StatCard icon={<Dumbbell size={14} className="text-danger" />} label="Workouts" value={`${stats.workouts}`} sub={`${stats.milestones} milestones`} />
            <StatCard icon={<GraduationCap size={14} className="text-info" />} label="Learning" value={formatMinutes(stats.learningMins)} sub={stats.learningItems > 0 ? `${stats.learningItems} completed` : 'this month'} />
            <StatCard icon={<TrendingUp size={14} className="text-success" />} label="Income" value={formatCurrency(Math.round(stats.totalIncome), currency)} sub={`${stats.budgets} budgets${stats.budgetsOver > 0 ? ` · ${stats.budgetsOver} over` : ''}`} subColor={stats.budgetsOver > 0 ? 'text-warning' : undefined} />
          </div>

          {/* Share */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={shareReport}
              fullWidth
              className={copied ? 'text-success' : ''}
            >
              {copied ? 'Copied!' : 'Copy Report'}
            </Button>
            {'share' in navigator && (
              <Button variant="ghost" size="sm" leftIcon={<Share2 size={14} />} onClick={shareNative}>
                Share
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, subColor,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; subColor?: string;
}) {
  return (
    <GlassCard padding="sm">
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-content-muted">{label}</p></div>
      <p className="text-lg font-bold text-content-primary leading-tight">{value}</p>
      <p className={`text-[11px] mt-0.5 ${subColor ?? 'text-content-muted'}`}>{sub}</p>
    </GlassCard>
  );
}
