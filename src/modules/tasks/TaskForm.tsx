import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { Task, TaskPriority, TaskCategory, RecurringFrequency } from '../../db/schema';
import { Button, Input, Select, Textarea, Toggle } from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { todayStr } from '../../utils/dates';

interface TaskFormProps {
  taskId?: number | null;
  onClose: () => void;
  defaultDueDate?: string;
}

const categoryOptions = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'learning', label: 'Learning' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
];

const recurringOptions = [
  { value: 'daily',    label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays only  (Mon – Fri)' },
  { value: 'weekends', label: 'Weekends only  (Sat – Sun)' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'monthly',  label: 'Monthly' },
];

export function TaskForm({ taskId, onClose, defaultDueDate }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate || todayStr());
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('weekly');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!taskId) return;
    db.tasks.get(taskId).then(task => {
      if (!task) return;
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate || todayStr());
      setDueTime(task.dueTime || '');
      setPriority(task.priority);
      setCategory(task.category);
      setIsRecurring(task.isRecurring);
      setRecurringFrequency(task.recurringFrequency || 'weekly');
    });
  }, [taskId]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data: Omit<Task, 'id'> = {
        title: title.trim(), description: description.trim() || undefined,
        dueDate: dueDate || undefined, dueTime: dueTime || undefined,
        priority, category, status: 'pending', isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        createdAt: now, updatedAt: now,
      };
      if (taskId) {
        await db.tasks.update(taskId, { ...data, updatedAt: now });
        toast.success('Task updated!');
      } else {
        await db.tasks.add(data);
        toast.success('Task added!');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Title *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        error={errors.title}
        autoFocus={!taskId}
      />

      <Textarea
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Add details (optional)"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <Input label="Due Time" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Priority</label>
        <div className="flex gap-2">
          {(['high', 'medium', 'low'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-all duration-200 ${
                priority === p
                  ? p === 'high' ? 'bg-danger text-white' : p === 'medium' ? 'bg-warning text-space-950' : 'bg-info text-white'
                  : 'glass-1 text-content-muted'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Category"
        value={category}
        onChange={e => setCategory(e.target.value as TaskCategory)}
        options={categoryOptions}
      />

      <Toggle
        checked={isRecurring}
        onChange={setIsRecurring}
        label="Recurring task"
        description="Automatically creates the next instance when completed"
      />

      {isRecurring && (
        <Select
          label="Repeat"
          value={recurringFrequency}
          onChange={e => setRecurringFrequency(e.target.value as RecurringFrequency)}
          options={recurringOptions}
        />
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" fullWidth onClick={handleSubmit} loading={loading}>
          {taskId ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </div>
  );
}
