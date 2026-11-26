import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, ProgressRing, Modal } from '../../components/ui';
import { HabitForm } from './HabitForm';
import { toast } from '../../stores/useToastStore';
import { todayStr } from '../../utils/dates';
import { calculateStreak, completionRate, isHabitScheduledOn } from '../../utils/habits';
import type { Habit } from '../../db/schema';
import { Plus, Check, Flame, BarChart3, Trash2, Edit3 } from 'lucide-react';
import { IconButton } from '../../components/ui';
import { format, subDays, addDays, startOfWeek, parseISO, getDate } from 'date-fns';
import { useAnalytics } from '../../analytics/AnalyticsContext';

export function HabitsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'stats'>('today');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const today = todayStr();

  const habits = useLiveQuery(
    () => db.habits.filter(h => !!h.isActive).sortBy('order'),
    [], [],
  );

  const todayCompletions = useLiveQuery(
    () => db.habitCompletions.where({ date: today }).toArray(),
    [today], [],
  );

  const allCompletions = useLiveQuery(
    () => db.habitCompletions.toArray(),
    [], [],
  );

  const completedIds = new Set(todayCompletions?.map(c => c.habitId) ?? []);
  const completedCount = completedIds.size;
  const totalCount = habits?.length ?? 0;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const { track } = useAnalytics();

  async function toggleHabit(habit: Habit) {
    if (!habit.id) return;
    if (completedIds.has(habit.id)) {
      // Un-complete
      const existing = todayCompletions?.find(c => c.habitId === habit.id);
      if (existing?.id) await db.habitCompletions.delete(existing.id);
    } else {
      // Complete
      await db.habitCompletions.add({ habitId: habit.id, date: today, completedAt: new Date().toISOString() });
      track('habit_completed', {});
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }

  async function archiveHabit() {
    if (!deletingId) return;
    await db.habits.update(deletingId, { isActive: 0 as any });
    setDeletingId(null);
    toast.success('Habit archived');
  }

  return (
    <div className="min-h-screen-dvh">
      <PageHeader
        title="Habits"
        subtitle={`${completedCount}/${totalCount} done today`}
        rightAction={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
            New
          </Button>
        }
      />

      <div className="px-4 pb-4 flex flex-col gap-3">
        {/* Progress summary */}
        {totalCount > 0 && (
          <GlassCard>
            <div className="flex items-center gap-4">
              <ProgressRing value={pct} size={72} strokeWidth={5} sublabel="today" />
              <div className="flex-1">
                <p className="text-lg font-bold text-content-primary">{completedCount} of {totalCount}</p>
                <p className="text-sm text-content-secondary">habits completed</p>
                <div className="flex gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-content-muted">
                    <Flame size={12} className="text-warning" />
                    Best streak: {getBestStreak(habits ?? [], allCompletions ?? [])}d
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        <Tabs
          tabs={[
            { id: 'today', label: 'Today', icon: <Check size={12} /> },
            { id: 'stats', label: 'Statistics', icon: <BarChart3 size={12} /> },
          ]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as any)}
        />

        {activeTab === 'today' && (
          <>
            {!habits?.length ? (
              <EmptyState
                icon={<Flame size={24} />}
                title="No habits yet"
                subtitle="Build consistency by tracking daily habits"
                action={{ label: 'Add First Habit', onClick: () => setIsFormOpen(true) }}
              />
            ) : (
              habits.map(habit => {
                const isCompleted = completedIds.has(habit.id!);
                const habitCompletions = allCompletions?.filter(c => c.habitId === habit.id) ?? [];
                const { current: streak } = calculateStreak(habitCompletions, habit);

                return (
                  <GlassCard key={habit.id} padding="sm">
                    <div className="flex items-center gap-3">
                      {/* Completion toggle */}
                      <button
                        onClick={() => toggleHabit(habit)}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0"
                        style={{
                          backgroundColor: isCompleted ? habit.color : 'transparent',
                          border: `2px solid ${habit.color}`,
                        }}
                      >
                        {isCompleted && <Check size={18} className="text-white" strokeWidth={3} />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isCompleted ? 'line-through text-content-muted' : 'text-content-primary'}`}>
                          {habit.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-content-muted capitalize">{habit.category}</span>
                          {streak > 0 && (
                            <div className="flex items-center gap-0.5 text-xs text-warning">
                              <Flame size={10} />
                              <span>{streak}d streak</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contribution dots (last 7 days) */}
                      <ContributionDots habit={habit} completions={allCompletions ?? []} />

                      {/* Actions */}
                      <div className="flex gap-1">
                        <IconButton icon={<Edit3 size={13} />} label={`Edit ${habit.name}`} onClick={() => { setEditingId(habit.id!); setIsFormOpen(true); }} />
                        <IconButton icon={<Trash2 size={13} />} label={`Archive ${habit.name}`} onClick={() => setDeletingId(habit.id!)} variant="danger" />
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <HabitStats habits={habits ?? []} completions={allCompletions ?? []} />
        )}
      </div>

      {/* Form */}
      <BottomSheet
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingId(null); }}
        title={editingId ? 'Edit Habit' : 'New Habit'}
        snapPoints
      >
        <HabitForm
          habitId={editingId}
          onClose={() => { setIsFormOpen(false); setEditingId(null); }}
        />
      </BottomSheet>

      {/* Archive confirm */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Archive Habit?" size="sm">
        <p className="text-sm text-content-secondary mb-4">This habit will be hidden but history preserved.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={archiveHabit}>Archive</Button>
        </div>
      </Modal>
    </div>
  );
}

function ContributionDots({ habit, completions }: { habit: Habit; completions: any[] }) {
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const done = completions.some(c => c.habitId === habit.id && c.date === d);
    return { d, done };
  });

  return (
    <div className="flex gap-1 shrink-0">
      {dots.map(({ d, done }) => (
        <div
          key={d}
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: done ? habit.color : 'rgba(255,255,255,0.08)' }}
        />
      ))}
    </div>
  );
}

function getBestStreak(habits: Habit[], completions: any[]): number {
  let best = 0;
  for (const h of habits) {
    const hc = completions.filter(c => c.habitId === h.id);
    const { longest } = calculateStreak(hc, h);
    if (longest > best) best = longest;
  }
  return best;
}

// ─── 90-day contribution heatmap ─────────────────────────────
// GitHub-style grid: 7 rows (Mon–Sun) × 13 columns (weeks)
// Colors: habit.color = completed, 20% opacity = scheduled-not-done,
//         near-transparent = not scheduled, blank = future
function HabitHeatmap({ habit, completions }: { habit: Habit; completions: any[] }) {
  const today     = new Date();
  const todayStr  = format(today, 'yyyy-MM-dd');
  // Start on the Monday of the week containing (today − 90 days)
  const startDate = startOfWeek(subDays(today, 90), { weekStartsOn: 1 });

  // Build all day objects from startDate to today
  const days: { dateStr: string; scheduled: boolean; completed: boolean }[] = [];
  let cur = startDate;
  while (format(cur, 'yyyy-MM-dd') <= todayStr) {
    const dateStr = format(cur, 'yyyy-MM-dd');
    days.push({
      dateStr,
      scheduled: isHabitScheduledOn(habit, cur),
      completed: completions.some(c => c.habitId === habit.id && c.date === dateStr),
    });
    cur = addDays(cur, 1);
  }

  // Group into weeks (each inner array = 7 days Mon–Sun)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Month labels above specific week columns
  const monthLabels: { weekIndex: number; label: string }[] = [];
  weeks.forEach((week, wi) => {
    if (week[0]) {
      const d = parseISO(week[0].dateStr);
      if (getDate(d) <= 7) { // first week of that month
        monthLabels.push({ weekIndex: wi, label: format(d, 'MMM') });
      }
    }
  });

  const CELL = 10;
  const GAP  = 2;
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="mt-3 overflow-x-auto">
      {/* Month labels */}
      {monthLabels.length > 0 && (
        <div className="flex mb-1" style={{ gap: GAP }}>
          {/* Space for day-of-week label column */}
          <div style={{ width: 10 }} />
          {weeks.map((_, wi) => {
            const ml = monthLabels.find(m => m.weekIndex === wi);
            return (
              <div
                key={wi}
                style={{ width: CELL, flexShrink: 0 }}
                className="text-[8px] text-content-muted text-center"
              >
                {ml?.label ?? ''}
              </div>
            );
          })}
        </div>
      )}

      {/* Grid rows — one row per day of week */}
      <div className="flex flex-col" style={{ gap: GAP }}>
        {DAY_LABELS.map((dayLabel, rowIdx) => (
          <div key={rowIdx} className="flex items-center" style={{ gap: GAP }}>
            {/* Day label */}
            <span className="text-[8px] text-content-muted" style={{ width: 10 }}>
              {rowIdx % 2 === 0 ? dayLabel : ''}
            </span>
            {/* Week columns */}
            {weeks.map((week, wi) => {
              const cell = week[rowIdx];
              let bg: string;
              if (!cell) {
                bg = 'transparent';
              } else if (cell.completed) {
                bg = habit.color;
              } else if (cell.scheduled) {
                bg = `${habit.color}30`;
              } else {
                bg = 'rgba(255,255,255,0.03)';
              }
              return (
                <div
                  key={wi}
                  title={cell?.dateStr}
                  style={{
                    width:           CELL,
                    height:          CELL,
                    borderRadius:    2,
                    backgroundColor: bg,
                    flexShrink:      0,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: habit.color }} />
          <span className="text-[9px] text-content-muted">Done</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: `${habit.color}30` }} />
          <span className="text-[9px] text-content-muted">Missed</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)' }} />
          <span className="text-[9px] text-content-muted">Not scheduled</span>
        </div>
      </div>
    </div>
  );
}

function HabitStats({ habits, completions }: { habits: Habit[]; completions: any[] }) {
  if (!habits.length) {
    return <EmptyState icon={<BarChart3 size={24} />} title="No habits to analyze" subtitle="Add habits first to see statistics" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.map(habit => {
        const hc = completions.filter(c => c.habitId === habit.id);
        const { current, longest } = calculateStreak(hc, habit);
        const rate7 = completionRate(hc, habit, 7);
        const rate30 = completionRate(hc, habit, 30);

        return (
          <GlassCard key={habit.id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
              <p className="text-sm font-semibold text-content-primary">{habit.name}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Current streak', value: `${current}d` },
                { label: 'Best streak', value: `${longest}d` },
                { label: '7-day rate', value: `${rate7}%` },
                { label: '30-day rate', value: `${rate30}%` },
              ].map(stat => (
                <div key={stat.label} className="glass-1 rounded-input p-2">
                  <p className="text-sm font-bold text-content-primary">{stat.value}</p>
                  <p className="text-[9px] text-content-muted mt-0.5 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* 90-day contribution heatmap */}
            <HabitHeatmap habit={habit} completions={hc} />
          </GlassCard>
        );
      })}
    </div>
  );
}
