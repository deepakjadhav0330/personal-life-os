import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { HabitCategory } from '../../db/schema';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { cn } from '../../utils/cn';

interface HabitFormProps {
  habitId?: number | null;
  onClose: () => void;
}

const COLORS = ['#22c55e', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];

const categoryOptions = [
  { value: 'fitness',       label: 'Fitness' },
  { value: 'health',        label: 'Health' },
  { value: 'learning',      label: 'Learning' },
  { value: 'mindfulness',   label: 'Mindfulness' },
  { value: 'productivity',  label: 'Productivity' },
  { value: 'finance',       label: 'Finance' },
  { value: 'personal',      label: 'Personal' },
  { value: 'other',         label: 'Other' },
];

// ── Frequency modes (what the user sees) ──────────────────────
type FreqMode = 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';

const FREQ_OPTIONS: { id: FreqMode; label: string; sublabel: string }[] = [
  { id: 'daily',    label: 'Every day',           sublabel: 'Mon to Sun' },
  { id: 'weekdays', label: 'Weekdays',             sublabel: 'Mon – Fri' },
  { id: 'weekends', label: 'Weekends',             sublabel: 'Sat & Sun' },
  { id: 'weekly',   label: 'Once a week',          sublabel: 'Any day' },
  { id: 'custom',   label: 'Custom days',          sublabel: 'Choose below' },
];

// Day labels (Mon–Sun order) with their JS getDay() values
const DAYS = [
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
  { label: 'Su', value: 0 },
];

// ── Helpers to detect preset from stored data ─────────────────
function detectFreqMode(freq: string, targetDays?: number[]): FreqMode {
  if (freq === 'daily')  return 'daily';
  if (freq === 'weekly') return 'weekly';
  if (freq === 'specific_days' && targetDays) {
    const sorted = [...targetDays].sort((a, b) => a - b).join(',');
    if (sorted === '1,2,3,4,5') return 'weekdays';
    if (sorted === '0,6')       return 'weekends';
    return 'custom';
  }
  return 'daily';
}

export function HabitForm({ habitId, onClose }: HabitFormProps) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<HabitCategory>('fitness');
  const [freqMode,    setFreqMode]    = useState<FreqMode>('daily');
  const [customDays,  setCustomDays]  = useState<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri
  const [color,       setColor]       = useState(COLORS[0]);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!habitId) return;
    db.habits.get(habitId).then(h => {
      if (!h) return;
      setName(h.name);
      setDescription(h.description || '');
      setCategory(h.category);
      setColor(h.color);
      const mode = detectFreqMode(h.frequency, h.targetDays);
      setFreqMode(mode);
      if (mode === 'custom' && h.targetDays) setCustomDays(h.targetDays);
    });
  }, [habitId]);

  const toggleCustomDay = (dayValue: number) => {
    setCustomDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Habit name is required'); return; }
    if (freqMode === 'custom' && customDays.length === 0) {
      toast.error('Pick at least one day');
      return;
    }

    setLoading(true);
    try {
      // Map UI mode → actual schema fields
      let frequency: string;
      let targetDays: number[] | undefined;

      switch (freqMode) {
        case 'weekdays': frequency = 'specific_days'; targetDays = [1, 2, 3, 4, 5]; break;
        case 'weekends': frequency = 'specific_days'; targetDays = [0, 6]; break;
        case 'custom':   frequency = 'specific_days'; targetDays = [...customDays].sort((a,b) => a-b); break;
        case 'weekly':   frequency = 'weekly';   targetDays = undefined; break;
        default:         frequency = 'daily';    targetDays = undefined; break;
      }

      const count = await db.habits.count();
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        frequency: frequency as any,
        targetDays,
        color,
        icon: 'Dumbbell',   // default icon
        isActive: 1 as any,
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

      <Input
        label="Habit Name *"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g. Morning workout"
        autoFocus
      />

      <Textarea
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Why is this habit important?"
        rows={2}
      />

      <Select
        label="Category"
        value={category}
        onChange={e => setCategory(e.target.value as HabitCategory)}
        options={categoryOptions}
      />

      {/* ── Frequency picker ─────────────────────────────── */}
      <div>
        <Select
          label="Frequency"
          value={freqMode}
          onChange={e => setFreqMode(e.target.value as FreqMode)}
          options={FREQ_OPTIONS.map(o => ({ value: o.id, label: `${o.label}  (${o.sublabel})` }))}
        />

        {/* Custom day picker — only shown when "Custom days" is selected */}
        {freqMode === 'custom' && (
          <div className="mt-3">
            <p className="text-[11px] text-content-muted mb-2">Select the days this habit runs:</p>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleCustomDay(day.value)}
                  className={cn(
                    'flex-1 h-9 rounded-input text-xs font-semibold transition-all duration-200',
                    customDays.includes(day.value)
                      ? 'accent-gradient text-white'
                      : 'glass-1 text-content-muted hover:text-content-secondary',
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Color picker ─────────────────────────────────── */}
      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">
          Colour
        </label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: c, outline: color === c ? '2px solid white' : 'none', outlineOffset: '2px' }}
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
