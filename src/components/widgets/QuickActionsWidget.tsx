import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, Dumbbell, Scale, CheckSquare, BookOpen, StickyNote } from 'lucide-react';
import { GlassCard, BottomSheet, Button, Input, Select } from '../ui';
import { db } from '../../db/database';
import { todayStr } from '../../utils/dates';
import { toast } from '../../stores/useToastStore';

const actions = [
  { id: 'task', label: 'Add Task', icon: Plus, color: '#6366f1' },
  { id: 'expense', label: 'Add Expense', icon: DollarSign, color: '#22c55e' },
  { id: 'workout', label: 'Log Workout', icon: Dumbbell, color: '#f59e0b' },
  { id: 'weight', label: 'Record Weight', icon: Scale, color: '#3b82f6' },
  { id: 'habit', label: 'Log Habit', icon: CheckSquare, color: '#8b5cf6' },
  { id: 'journal', label: 'Journal', icon: BookOpen, color: '#f97316' },
  { id: 'note', label: 'Quick Note', icon: StickyNote, color: '#14b8a6' },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Quick task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Quick expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');

  // Quick weight form state
  const [weight, setWeight] = useState('');

  // Quick note state
  const [noteText, setNoteText] = useState('');

  const handleAction = (id: string) => {
    if (id === 'journal') { navigate('/journal'); return; }
    if (id === 'workout') { navigate('/fitness'); return; }
    if (id === 'habit') { navigate('/habits'); return; }
    setActiveAction(id);
  };

  const saveTask = async () => {
    if (!taskTitle.trim()) return;
    await db.tasks.add({
      title: taskTitle.trim(), priority: taskPriority, category: 'personal',
      status: 'pending', isRecurring: false,
      dueDate: todayStr(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    toast.success('Task added!');
    setTaskTitle(''); setActiveAction(null);
  };

  const saveExpense = async () => {
    const amount = parseFloat(expenseAmount);
    if (!amount || isNaN(amount)) return;
    await db.transactions.add({
      type: 'expense', amount, currency: 'INR', date: todayStr(),
      category: expenseCategory, paymentMethod: 'upi', isRecurring: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    toast.success('Expense added!');
    setExpenseAmount(''); setActiveAction(null);
  };

  const saveWeight = async () => {
    const val = parseFloat(weight);
    if (!val || isNaN(val)) return;
    await db.bodyMeasurements.add({
      date: todayStr(), type: 'weight', value: val, unit: 'kg',
      createdAt: new Date().toISOString(),
    });
    toast.success('Weight recorded!');
    setWeight(''); setActiveAction(null);
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    await db.journalEntries.add({
      date: todayStr(), type: 'entry', freeText: noteText.trim(),
      wordCount: noteText.trim().split(/\s+/).length,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    toast.success('Note saved!');
    setNoteText(''); setActiveAction(null);
  };

  return (
    <>
      <GlassCard padding="sm">
        <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3 px-1">Quick Actions</p>
        <div className="flex gap-3 overflow-x-auto scroll-smooth-snap pb-1">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex flex-col items-center gap-2 shrink-0 min-w-[64px]"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform active:scale-95"
                style={{ background: `${action.color}18`, border: `1px solid ${action.color}30`, borderTopColor: `${action.color}60` }}
              >
                <action.icon size={22} style={{ color: action.color }} />
              </div>
              <span className="text-[10px] text-content-muted text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Quick Task */}
      <BottomSheet open={activeAction === 'task'} onClose={() => setActiveAction(null)} title="Add Task">
        <div className="flex flex-col gap-4">
          <Input label="Task Title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setTaskPriority(p)}
                className={`flex-1 py-2 rounded-input text-sm font-medium transition-all ${taskPriority === p ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={saveTask} disabled={!taskTitle.trim()}>Add Task</Button>
        </div>
      </BottomSheet>

      {/* Quick Expense */}
      <BottomSheet open={activeAction === 'expense'} onClose={() => setActiveAction(null)} title="Add Expense">
        <div className="flex flex-col gap-4">
          <Input label="Amount (₹)" type="number" inputMode="decimal" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" autoFocus />
          <Select
            label="Category"
            value={expenseCategory}
            onChange={e => setExpenseCategory(e.target.value)}
            options={[
              { value: 'food', label: 'Food' }, { value: 'groceries', label: 'Groceries' },
              { value: 'transport', label: 'Transport' }, { value: 'shopping', label: 'Shopping' },
              { value: 'entertainment', label: 'Entertainment' }, { value: 'other', label: 'Other' },
            ]}
          />
          <Button variant="primary" onClick={saveExpense} disabled={!expenseAmount}>Add Expense</Button>
        </div>
      </BottomSheet>

      {/* Quick Weight */}
      <BottomSheet open={activeAction === 'weight'} onClose={() => setActiveAction(null)} title="Record Weight">
        <div className="flex flex-col gap-4">
          <Input label="Weight (kg)" type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75.0" autoFocus />
          <Button variant="primary" onClick={saveWeight} disabled={!weight}>Record Weight</Button>
        </div>
      </BottomSheet>

      {/* Quick Note */}
      <BottomSheet open={activeAction === 'note'} onClose={() => setActiveAction(null)} title="Quick Note">
        <div className="flex flex-col gap-4">
          <textarea
            className="glass-input rounded-input p-3 text-sm text-content-primary placeholder:text-content-muted resize-none w-full"
            rows={5}
            placeholder="Jot down anything on your mind..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            autoFocus
          />
          <Button variant="primary" onClick={saveNote} disabled={!noteText.trim()}>Save Note</Button>
        </div>
      </BottomSheet>
    </>
  );
}
