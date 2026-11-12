import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { HabitCategory, HabitFrequency } from '../../db/schema';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { toast } from '../../stores/useToastStore';

interface HabitFormProps {
  habitId?: number | null;
  onClose: () => void;
}

const COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];
const ICONS = ['Dumbbell', 'BookOpen', 'Brain', 'UtensilsCrossed', 'Moon', 'ClipboardList', 'Heart', 'Music', 'Droplets', 'Zap'];

const categoryOptions = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'finance', label: 'Finance' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const frequencyOptions = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
];

export function HabitForm({ habitId, onClose }: HabitFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('fitness');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!habitId) return;
    db.habits.get(habitId).then(h => {
      if (!h) return;
      setName(h.name);
      setDescription(h.description || '');
      setCategory(h.category);
      setFrequency(h.frequency);
      setColor(h.color);
      setIcon(h.icon);
    });
  }, [habitId]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Habit name is required'); return; }
    setLoading(true);
    try {
      const count = await db.habits.count();
      const data = {
        name: name.trim(), description: description.trim() || undefined,
        category, frequency, color, icon, isActive: true as any,
        order: habitId ? undefined : count,
      };
      if (habitId) {
        await db.habits.update(habitId, data);
        toast.success('Habit updated!');
      } else {
        await db.habits.add({ ...data, order: count, createdAt: new Date().toISOString() });
        toast.success('Habit created!');
      }
      onClose();
    } catch {
      toast.error('Failed to save habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input label="Habit Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning workout" autoFocus />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Why is this habit important?" rows={2} />
      <Select label="Category" value={category} onChange={e => setCategory(e.target.value as HabitCategory)} options={categoryOptions} />
      <Select label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value as HabitFrequency)} options={frequencyOptions} />

      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform active:scale-90"
              style={{
                backgroundColor: c,
                outline: color === c ? '2px solid white' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" fullWidth onClick={handleSubmit} loading={loading}>
          {habitId ? 'Update Habit' : 'Add Habit'}
        </Button>
      </div>
    </div>
  );
}
