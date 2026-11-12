import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, ProgressRing, Modal } from '../../components/ui';
import { HabitForm } from './HabitForm';
import { toast } from '../../stores/useToastStore';
import { todayStr } from '../../utils/dates';
import { calculateStreak, completionRate } from '../../utils/habits';
import type { Habit } from '../../db/schema';
import { Plus, Check, Flame, BarChart3, Trash2, Edit3 } from 'lucide-react';
import { format, subDays } from 'date-fns';

export function HabitsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'stats'>('today');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const today = todayStr();

  const habits = useLiveQuery(
    () => db.habits.where({ isActive: 1 as any }).sortBy('order'),
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

  async function toggleHabit(habit: Habit) {
    if (!habit.id) return;
    if (completedIds.has(habit.id)) {
      // Un-complete
      const existing = todayCompletions?.find(c => c.habitId === habit.id);
      if (existing?.id) await db.habitCompletions.delete(existing.id);
    } else {
      // Complete
      await db.habitCompletions.add({ habitId: habit.id, date: today, completedAt: new Date().toISOString() });
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }

  async function archiveHabit() {
    if (!deletingId) return;
    await db.habits.update(deletingId, { isActive: false as any });
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
                        <button onClick={() => { setEditingId(habit.id!); setIsFormOpen(true); }} className="p-1.5 rounded-lg glass-1 text-content-muted hover:text-content-primary">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => setDeletingId(habit.id!)} className="p-1.5 rounded-lg glass-1 text-content-muted hover:text-danger">
                          <Trash2 size={13} />
                        </button>
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
          </GlassCard>
        );
      })}
    </div>
  );
}
