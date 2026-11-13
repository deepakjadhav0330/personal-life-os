import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, Badge, ProgressBar, Input, Select, Textarea, Modal, IconButton } from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { formatDate, isOverdue } from '../../utils/dates';
import type { Goal, GoalCategory, Milestone } from '../../db/schema';
import { Target, CheckCircle2, Plus, Edit3, Trash2 } from 'lucide-react';

const GOAL_COLORS = ['#7c3aed', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6', '#f97316'];

const categoryOptions: { value: GoalCategory; label: string }[] = [
  { value: 'fitness', label: '💪 Fitness' }, { value: 'career', label: '💼 Career' },
  { value: 'finance', label: '💰 Finance' }, { value: 'learning', label: '📚 Learning' },
  { value: 'personal', label: '🌟 Personal' }, { value: 'relationships', label: '💞 Relationships' },
  { value: 'lifestyle', label: '🌿 Lifestyle' },
];

export function GoalsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<GoalCategory | 'all'>('all');

  const goals = useLiveQuery(
    () => db.goals.where('status').anyOf(activeTab === 'active' ? ['active', 'paused'] : ['completed']).toArray(),
    [activeTab], [],
  );

  const allMilestones = useLiveQuery(() => db.milestones.toArray(), [], []);

  function getProgress(goalId: number): number {
    const ms = allMilestones?.filter(m => m.goalId === goalId) ?? [];
    if (!ms.length) return 0;
    return Math.round(ms.filter(m => m.status === 'completed').length / ms.length * 100);
  }

  const filtered = filterCategory === 'all' ? (goals ?? []) : (goals ?? []).filter(g => g.category === filterCategory);

  async function deleteGoal() {
    if (!deletingId) return;
    await db.goals.delete(deletingId);
    await db.milestones.where('goalId').equals(deletingId).delete();
    setDeletingId(null);
    toast.success('Goal deleted');
  }

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Goals" subtitle={`${goals?.length ?? 0} goals`} rightAction={
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>New Goal</Button>
      } />

      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs
          tabs={[{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as any)}
        />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scroll-smooth-snap pb-1">
          {(['all', ...categoryOptions.map(c => c.value)] as (GoalCategory | 'all')[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-pill text-xs whitespace-nowrap transition-all ${filterCategory === cat ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {!filtered.length ? (
          <EmptyState
            icon={<Target size={24} />}
            title={activeTab === 'active' ? 'No active goals' : 'No completed goals yet'}
            subtitle={activeTab === 'active' ? 'Set a goal to start working towards it' : 'Complete goals to see them here'}
            action={activeTab === 'active' ? { label: 'Add Goal', onClick: () => setIsFormOpen(true) } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(goal => {
              const progress = getProgress(goal.id!);
              const milestones = allMilestones?.filter(m => m.goalId === goal.id) ?? [];
              const overdue = goal.targetDate && isOverdue(goal.targetDate);
              return (
                <GlassCard
                  key={goal.id}
                  variant="interactive"
                  onClick={() => setSelectedGoal(goal)}
                  className={`border-l-2 ${overdue ? 'border-danger/40' : 'border-transparent'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${goal.color}22` }}
                    >
                      <Target size={18} style={{ color: goal.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-content-primary">{goal.title}</p>
                        {overdue && <Badge variant="danger" size="xs">Overdue</Badge>}
                        {goal.status === 'paused' && <Badge variant="warning" size="xs">Paused</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-content-muted capitalize">{goal.category}</span>
                        {goal.targetDate && (
                          <span className="text-xs text-content-muted">· Due {formatDate(goal.targetDate)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <ProgressBar value={progress} color="custom" customColor={goal.color} className="flex-1" size="xs" />
                        <span className="text-xs text-content-muted">{progress}%</span>
                      </div>
                      <p className="text-xs text-content-muted mt-1">{milestones.filter(m => m.status === 'completed').length}/{milestones.length} milestones</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <IconButton icon={<Edit3 size={12} />} label={`Edit ${goal.title}`} onClick={e => { e.stopPropagation(); setEditingId(goal.id!); setIsFormOpen(true); }} />
                      <IconButton icon={<Trash2 size={12} />} label={`Delete ${goal.title}`} onClick={e => { e.stopPropagation(); setDeletingId(goal.id!); }} variant="danger" />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit form */}
      <BottomSheet open={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingId(null); }} title={editingId ? 'Edit Goal' : 'New Goal'} snapPoints>
        <GoalForm goalId={editingId} onClose={() => { setIsFormOpen(false); setEditingId(null); }} />
      </BottomSheet>

      {/* Goal detail */}
      <BottomSheet open={!!selectedGoal} onClose={() => setSelectedGoal(null)} title={selectedGoal?.title ?? ''} snapPoints>
        {selectedGoal && (
          <GoalDetail
            goal={selectedGoal}
            milestones={allMilestones?.filter(m => m.goalId === selectedGoal.id) ?? []}
            onClose={() => setSelectedGoal(null)}
          />
        )}
      </BottomSheet>

      {/* Delete confirm */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Goal?" size="sm">
        <p className="text-sm text-content-secondary mb-4">Goal and all milestones will be deleted.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={deleteGoal}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function GoalForm({ goalId, onClose }: { goalId: number | null; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [milestones, setMilestones] = useState<{ title: string }[]>([]);

  useEffect(() => {
    if (!goalId) return;
    db.goals.get(goalId).then(g => {
      if (!g) return;
      setTitle(g.title); setCategory(g.category); setDescription(g.description ?? '');
      setTargetDate(g.targetDate ?? ''); setColor(g.color);
    });
    db.milestones.where('goalId').equals(goalId).sortBy('order').then(ms => {
      setMilestones(ms.map(m => ({ title: m.title })));
    });
  }, [goalId]);

  const save = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      if (goalId) {
        await db.goals.update(goalId, { title, category, description, targetDate: targetDate || undefined, color, updatedAt: now });
      } else {
        const id = await db.goals.add({
          title, category, description: description || undefined, targetDate: targetDate || undefined,
          color, status: 'active', progressMode: 'milestones',
          createdAt: now, updatedAt: now,
        });
        // Add milestones
        for (let i = 0; i < milestones.length; i++) {
          if (milestones[i].title.trim()) {
            await db.milestones.add({ goalId: id as number, title: milestones[i].title, status: 'pending', order: i, createdAt: now });
          }
        }
      }
      toast.success(goalId ? 'Goal updated!' : 'Goal created!');
      onClose();
    } catch { toast.error('Failed to save'); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input label="Goal Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run 5K in 25 mins" autoFocus />
      <Select label="Category" value={category} onChange={e => setCategory(e.target.value as GoalCategory)} options={categoryOptions} />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does success look like?" rows={2} />
      <Input label="Target Date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />

      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {GOAL_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: c, outline: color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
          ))}
        </div>
      </div>

      {!goalId && (
        <div>
          <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Milestones (optional)</label>
          {milestones.map((m, i) => (
            <Input key={i} placeholder={`Milestone ${i + 1}`} value={m.title}
              onChange={e => { const ms = [...milestones]; ms[i].title = e.target.value; setMilestones(ms); }} />
          ))}
          <Button variant="ghost" size="sm" onClick={() => setMilestones([...milestones, { title: '' }])}>+ Add Milestone</Button>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} loading={loading}>{goalId ? 'Update Goal' : 'Create Goal'}</Button>
      </div>
    </div>
  );
}

function GoalDetail({ goal, milestones, onClose }: { goal: Goal; milestones: Milestone[]; onClose: () => void }) {
  const [newMilestone, setNewMilestone] = useState('');
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);

  const sortedMs = [...milestones].sort((a, b) => a.order - b.order);
  const progress = milestones.length ? Math.round(milestones.filter(m => m.status === 'completed').length / milestones.length * 100) : 0;

  const toggleMilestone = async (ms: Milestone) => {
    const now = new Date().toISOString();
    if (ms.status === 'completed') {
      await db.milestones.update(ms.id!, { status: 'pending', completedAt: undefined });
    } else {
      await db.milestones.update(ms.id!, { status: 'completed', completedAt: now });
      toast.success('Milestone completed! 🎯');
      const updated = await db.milestones.where('goalId').equals(goal.id!).toArray();
      if (updated.every(m => m.id === ms.id ? true : m.status === 'completed')) {
        setShowCompletePrompt(true);
      }
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    const count = milestones.length;
    await db.milestones.add({ goalId: goal.id!, title: newMilestone.trim(), status: 'pending', order: count, createdAt: new Date().toISOString() });
    setNewMilestone('');
    toast.success('Milestone added!');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-3xl font-bold" style={{ color: goal.color }}>{progress}%</p>
          <p className="text-xs text-content-muted">progress</p>
        </div>
        <div className="flex-1">
          {goal.description && <p className="text-sm text-content-secondary mb-2">{goal.description}</p>}
          {goal.targetDate && <p className="text-xs text-content-muted">Due: {formatDate(goal.targetDate)}</p>}
        </div>
      </div>

      <ProgressBar value={progress} color="custom" customColor={goal.color} size="md" showLabel />

      <div>
        <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Milestones</p>
        {!sortedMs.length && <p className="text-sm text-content-muted">No milestones yet</p>}
        {sortedMs.map(ms => (
          <div key={ms.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
            <button
              onClick={() => toggleMilestone(ms)}
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: ms.status === 'completed' ? '#22c55e' : goal.color, backgroundColor: ms.status === 'completed' ? '#22c55e' : 'transparent' }}
            >
              {ms.status === 'completed' && <CheckCircle2 size={14} className="text-white" />}
            </button>
            <p className={`flex-1 text-sm ${ms.status === 'completed' ? 'line-through text-content-muted' : 'text-content-primary'}`}>{ms.title}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <Input
          value={newMilestone}
          onChange={e => setNewMilestone(e.target.value)}
          placeholder="Add milestone…"
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addMilestone()}
        />
        <Button variant="primary" size="sm" onClick={addMilestone} disabled={!newMilestone.trim()}>Add</Button>
      </div>

      {/* All milestones done — prompt to complete the goal */}
      <Modal open={showCompletePrompt} onClose={() => setShowCompletePrompt(false)} title="🏆 All milestones complete!" size="sm">
        <p className="text-sm text-content-secondary mb-4">Every milestone is done. Would you like to mark this goal as completed?</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setShowCompletePrompt(false)}>Keep Active</Button>
          <Button variant="primary" fullWidth onClick={async () => {
            await db.goals.update(goal.id!, { status: 'completed', updatedAt: new Date().toISOString() });
            toast.success('Goal completed! 🏆');
            setShowCompletePrompt(false);
            onClose();
          }}>Mark Complete</Button>
        </div>
      </Modal>
    </div>
  );
}
