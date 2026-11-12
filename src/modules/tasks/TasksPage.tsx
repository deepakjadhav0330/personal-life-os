import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, Badge, EmptyState, BottomSheet, Modal } from '../../components/ui';
import { TaskForm } from './TaskForm';
import { toast } from '../../stores/useToastStore';
import type { Task } from '../../db/schema';
import { todayStr, formatDateRelative, isOverdue } from '../../utils/dates';
import { Plus, CheckCircle2, Trash2, Edit3, Search, X, AlertCircle } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

type Tab = 'today' | 'upcoming' | 'overdue' | 'all' | 'completed';

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const today = todayStr();

  const allTasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray(), [], []);

  function filterTasks(tasks: Task[]): Task[] {
    let result = tasks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    switch (activeTab) {
      case 'today':
        return result.filter(t => t.status === 'pending' && t.dueDate === today);
      case 'upcoming':
        return result.filter(t => t.status === 'pending' && t.dueDate && t.dueDate > today)
          .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
      case 'overdue':
        return result.filter(t => t.status === 'pending' && t.dueDate && t.dueDate < today);
      case 'all':
        return result.filter(t => t.status === 'pending').sort((a, b) => {
          const pp = { high: 0, medium: 1, low: 2 };
          return (pp[a.priority] - pp[b.priority]);
        });
      case 'completed':
        return result.filter(t => t.status === 'completed')
          .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
      default:
        return result;
    }
  }

  const tasks = filterTasks(allTasks ?? []);
  const overdueCt = allTasks?.filter(t => t.status === 'pending' && t.dueDate && t.dueDate < today).length ?? 0;

  async function completeTask(task: Task) {
    const now = new Date().toISOString();
    await db.tasks.update(task.id!, { status: 'completed', completedAt: now, updatedAt: now });

    // If recurring, create next instance
    if (task.isRecurring && task.recurringFrequency && task.dueDate) {
      const nextDate = task.recurringFrequency === 'daily'
        ? format(addDays(parseISO(task.dueDate), 1), 'yyyy-MM-dd')
        : task.recurringFrequency === 'weekly'
          ? format(addDays(parseISO(task.dueDate), 7), 'yyyy-MM-dd')
          : format(addDays(parseISO(task.dueDate), 30), 'yyyy-MM-dd');
      await db.tasks.add({
        ...task, id: undefined, status: 'pending', completedAt: undefined,
        dueDate: nextDate, recurringParentId: task.id,
        createdAt: now, updatedAt: now,
      });
    }
    toast.success('Task completed! 🎉');
  }

  async function undoComplete(task: Task) {
    await db.tasks.update(task.id!, { status: 'pending', completedAt: undefined, updatedAt: new Date().toISOString() });
  }

  async function deleteTask() {
    if (!deletingId) return;
    await db.tasks.delete(deletingId);
    setDeletingId(null);
    toast.success('Task deleted');
  }

  const tabs = [
    { id: 'today', label: 'Today', count: allTasks?.filter(t => t.status === 'pending' && t.dueDate === today).length },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'overdue', label: 'Overdue', count: overdueCt },
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Done' },
  ];

  return (
    <div className="min-h-screen-dvh">
      <PageHeader
        title="Tasks"
        subtitle={`${allTasks?.filter(t => t.status === 'pending').length ?? 0} pending`}
        rightAction={
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
              {showSearch ? <X size={18} /> : <Search size={18} />}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
              Add
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-4 flex flex-col gap-3">
        {showSearch && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
            <input
              className="w-full h-11 rounded-input glass-input text-content-primary placeholder:text-content-muted pl-9 pr-3 text-sm"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {overdueCt > 0 && activeTab !== 'overdue' && (
          <button onClick={() => setActiveTab('overdue')} className="flex items-center gap-2 px-3 py-2 rounded-input bg-danger/10 border border-danger/30 text-left">
            <AlertCircle size={14} className="text-danger shrink-0" />
            <span className="text-xs text-danger font-medium">{overdueCt} overdue task{overdueCt > 1 ? 's' : ''} — tap to review</span>
          </button>
        )}

        <Tabs tabs={tabs as any} activeTab={activeTab} onChange={id => setActiveTab(id as Tab)} variant="underline" scrollable />

        {!tasks.length ? (
          <EmptyState
            icon={<CheckCircle2 size={24} />}
            title={activeTab === 'today' ? 'All clear for today!' : 'No tasks here'}
            subtitle={activeTab === 'today' ? 'Add a task to stay on track' : undefined}
            action={{ label: 'Add Task', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={() => completeTask(task)}
                onUndo={() => undoComplete(task)}
                onEdit={() => { setEditingId(task.id!); setIsFormOpen(true); }}
                onDelete={() => setDeletingId(task.id!)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit sheet */}
      <BottomSheet
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingId(null); }}
        title={editingId ? 'Edit Task' : 'Add Task'}
        snapPoints
      >
        <TaskForm
          taskId={editingId}
          onClose={() => { setIsFormOpen(false); setEditingId(null); }}
        />
      </BottomSheet>

      {/* Delete confirmation */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Task?" size="sm">
        <p className="text-sm text-content-secondary mb-4">This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={deleteTask}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  onComplete: () => void;
  onUndo: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TaskRow({ task, onComplete, onUndo, onEdit, onDelete }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = task.status === 'pending' && isOverdue(task.dueDate ?? '');

  const priorityColor = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6';

  return (
    <GlassCard padding="sm" className={overdue ? 'border-danger/30 border-t-danger/50' : ''}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={task.status === 'completed' ? onUndo : onComplete}
          className="mt-0.5 shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200"
          style={{ border: `2px solid ${task.status === 'completed' ? '#22c55e' : priorityColor}` }}
        >
          {task.status === 'completed' && (
            <CheckCircle2 size={14} className="text-success" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-content-muted' : 'text-content-primary'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.dueDate && (
              <span className={`text-xs ${overdue ? 'text-danger' : 'text-content-muted'}`}>
                {overdue ? '⚠ ' : ''}{formatDateRelative(task.dueDate)}
                {task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}
            <Badge variant={`priority-${task.priority}` as any} size="xs">{task.priority}</Badge>
            {task.isRecurring && <Badge variant="info" size="xs">↻ {task.recurringFrequency}</Badge>}
          </div>
          {expanded && task.description && (
            <p className="text-xs text-content-muted mt-2 leading-relaxed">{task.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          {task.status !== 'completed' && (
            <button onClick={onEdit} className="p-1.5 rounded-lg glass-1 text-content-muted hover:text-content-primary transition-colors">
              <Edit3 size={13} />
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg glass-1 text-content-muted hover:text-danger transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
