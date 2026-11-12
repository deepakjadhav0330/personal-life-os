import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, Modal, Input, Select, Toggle } from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { useSetting } from '../../hooks/useSetting';
import { formatCurrency } from '../../utils/format';
import { todayStr, formatDate } from '../../utils/dates';
import type { PaymentMethod } from '../../db/schema';
import { Plus, TrendingUp, TrendingDown, Wallet, PieChart, Trash2, Edit3 } from 'lucide-react';
import { PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { startOfMonth, endOfMonth, format as dateFmt, subMonths } from 'date-fns';

type FinanceTab = 'overview' | 'transactions' | 'budgets';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b', groceries: '#22c55e', shopping: '#8b5cf6',
  travel: '#3b82f6', transport: '#06b6d4', entertainment: '#ec4899',
  fitness: '#10b981', healthcare: '#ef4444', bills: '#6366f1',
  subscriptions: '#f97316', other: '#94a3b8',
  salary: '#22c55e', freelance: '#3b82f6', investment: '#8b5cf6',
  gift: '#f59e0b',
};

const GlassTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-elevated rounded-input px-3 py-2 text-xs">
      <p style={{ color: payload[0].fill }}>{payload[0].name}: {payload[0].value}</p>
    </div>
  );
};

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Finance" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'budgets', label: 'Budgets' },
          ]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as FinanceTab)}
        />
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'budgets' && <BudgetsTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const [currency] = useSetting('currency', 'INR');
  const now = new Date();
  const monthStart = dateFmt(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = dateFmt(endOfMonth(now), 'yyyy-MM-dd');

  const monthTxns = useLiveQuery(
    () => db.transactions.where('date').between(monthStart, monthEnd, true, true).toArray(),
    [monthStart],
    [],
  );

  const income = monthTxns?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0;
  const expenses = monthTxns?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0;
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  monthTxns?.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + t.amount;
  });
  const pieData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  // 6-month trend
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const start = dateFmt(startOfMonth(d), 'yyyy-MM-dd');
    const end = dateFmt(endOfMonth(d), 'yyyy-MM-dd');
    return { month: dateFmt(d, 'MMM'), start, end };
  });

  const trendData = useLiveQuery(async () => {
    return Promise.all(monthlyData.map(async ({ month, start, end }) => {
      const txns = await db.transactions.where('date').between(start, end, true, true).toArray();
      return {
        month,
        income: txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    }));
  }, [], []);

  return (
    <div className="flex flex-col gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <GlassCard padding="sm">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-success" /><p className="text-xs text-content-muted">Income</p></div>
          <p className="text-lg font-bold text-success">{formatCurrency(income, currency)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-danger" /><p className="text-xs text-content-muted">Expenses</p></div>
          <p className="text-lg font-bold text-danger">{formatCurrency(expenses, currency)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="flex items-center gap-2 mb-1"><Wallet size={14} className="text-accent" /><p className="text-xs text-content-muted">Savings</p></div>
          <p className={`text-lg font-bold ${savings >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(savings, currency)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="flex items-center gap-2 mb-1"><PieChart size={14} className="text-warning" /><p className="text-xs text-content-muted">Rate</p></div>
          <p className={`text-lg font-bold ${savingsRate > 20 ? 'text-success' : savingsRate > 10 ? 'text-warning' : 'text-danger'}`}>{savingsRate}%</p>
        </GlassCard>
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">Category Breakdown</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <RePie>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </RePie>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col gap-1.5">
              {pieData.slice(0, 5).map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#94a3b8' }} />
                  <span className="text-xs text-content-secondary capitalize flex-1">{item.name}</span>
                  <span className="text-xs font-medium text-content-primary">{formatCurrency(item.value, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* 6-month trend */}
      {(trendData ?? []).some(d => d.income > 0 || d.expenses > 0) && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-3">6-Month Trend</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={trendData ?? []}>
              <XAxis dataKey="month" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="income" fill="#22c55e" radius={[2, 2, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[2, 2, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [currency] = useSetting('currency', 'INR');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const transactions = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().limit(50).toArray(),
    [], [],
  );

  const filtered = filterType === 'all' ? (transactions ?? []) : (transactions ?? []).filter(t => t.type === filterType);

  async function deleteTransaction() {
    if (!deletingId) return;
    await db.transactions.delete(deletingId);
    setDeletingId(null);
    toast.success('Transaction deleted');
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)} className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-all ${filterType === f ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>Add</Button>
      </div>

      {!filtered.length ? (
        <EmptyState icon={<Wallet size={24} />} title="No transactions" action={{ label: 'Add First', onClick: () => setIsFormOpen(true) }} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(txn => (
            <GlassCard key={txn.id} padding="sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm"
                  style={{ backgroundColor: `${CATEGORY_COLORS[txn.category] ?? '#94a3b8'}22` }}
                >
                  {txn.type === 'income' ? '📈' : getCategoryEmoji(txn.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">{txn.description || txn.category}</p>
                  <p className="text-xs text-content-muted">{formatDate(txn.date)} · {txn.paymentMethod.replace('_', ' ')}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${txn.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount, currency)}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(txn.id!); setIsFormOpen(true); }} className="p-1 glass-1 rounded text-content-muted hover:text-content-primary">
                    <Edit3 size={12} />
                  </button>
                  <button onClick={() => setDeletingId(txn.id!)} className="p-1 glass-1 rounded text-content-muted hover:text-danger">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <BottomSheet open={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingId(null); }} title={editingId ? 'Edit Transaction' : 'Add Transaction'} snapPoints>
        <TransactionForm txnId={editingId} onClose={() => { setIsFormOpen(false); setEditingId(null); }} />
      </BottomSheet>

      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Transaction?" size="sm">
        <p className="text-sm text-content-secondary mb-4">This cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={deleteTransaction}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}

function TransactionForm({ txnId, onClose }: { txnId: number | null; onClose: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState('food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currency] = useSetting('currency', 'INR');

  useState(() => {
    if (!txnId) return;
    db.transactions.get(txnId).then(txn => {
      if (!txn) return;
      setType(txn.type); setAmount(txn.amount.toString()); setDate(txn.date);
      setCategory(txn.category); setPaymentMethod(txn.paymentMethod);
      setDescription(txn.description ?? ''); setIsRecurring(txn.isRecurring);
    });
  });

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt)) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data = {
        type, amount: amt, currency, date, category, paymentMethod,
        description: description.trim() || undefined, isRecurring,
        recurringFrequency: isRecurring ? 'monthly' as const : undefined,
        createdAt: now, updatedAt: now,
      };
      if (txnId) { await db.transactions.update(txnId, data); toast.success('Updated!'); }
      else { await db.transactions.add(data); toast.success('Added!'); }
      onClose();
    } catch { toast.error('Failed to save'); } finally { setLoading(false); }
  };

  const expenseCategories = ['food', 'groceries', 'shopping', 'travel', 'transport', 'entertainment', 'fitness', 'healthcare', 'bills', 'subscriptions', 'other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const incomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['income', 'expense'] as const).map(t => (
          <button key={t} onClick={() => setType(t)} className={`flex-1 py-2.5 rounded-input text-sm font-medium transition-all ${type === t ? (t === 'income' ? 'bg-success text-white' : 'bg-danger text-white') : 'glass-1 text-content-muted'}`}>
            {t === 'income' ? '+ Income' : '- Expense'}
          </button>
        ))}
      </div>
      <Input label="Amount *" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus leftElement={<span className="text-xs">{currency === 'INR' ? '₹' : '$'}</span>} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value)} options={type === 'income' ? incomeCategories : expenseCategories} />
        <Select label="Payment" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} options={[
          { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' },
          { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'other', label: 'Other' },
        ]} />
      </div>
      <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" />
      <Toggle checked={isRecurring} onChange={setIsRecurring} label="Recurring monthly" />
      <div className="flex gap-3">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" fullWidth onClick={handleSubmit} loading={loading}>Save</Button>
      </div>
    </div>
  );
}

function BudgetsTab() {
  const [currency] = useSetting('currency', 'INR');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('food');
  const [budgetLimit, setBudgetLimit] = useState('');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = dateFmt(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = dateFmt(endOfMonth(now), 'yyyy-MM-dd');

  const budgets = useLiveQuery(
    () => db.budgets.where('[year+month+category]').between([year, month, 'a'], [year, month, 'z'], true, true).toArray(),
    [year, month],
    [],
  );

  const monthExpenses = useLiveQuery(
    () => db.transactions.where('date').between(monthStart, monthEnd, true, true).filter(t => t.type === 'expense').toArray(),
    [monthStart],
    [],
  );

  const categorySpending: Record<string, number> = {};
  (monthExpenses ?? []).forEach(t => {
    categorySpending[t.category] = (categorySpending[t.category] ?? 0) + t.amount;
  });

  const saveBudget = async () => {
    const limit = parseFloat(budgetLimit);
    if (!limit) return;
    const existing = budgets?.find(b => b.category === budgetCategory);
    const now = new Date().toISOString();
    if (existing?.id) {
      await db.budgets.update(existing.id, { limit, updatedAt: now });
    } else {
      await db.budgets.add({ year, month, category: budgetCategory, limit, currency, createdAt: now, updatedAt: now });
    }
    toast.success('Budget saved!');
    setBudgetLimit('');
    setIsFormOpen(false);
  };

  const categories = ['food', 'groceries', 'shopping', 'transport', 'entertainment', 'fitness', 'healthcare', 'bills', 'subscriptions'];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>Set Budget</Button>
      </div>

      {!budgets?.length ? (
        <EmptyState icon={<Wallet size={24} />} title="No budgets set" subtitle="Set monthly limits per category" action={{ label: 'Set Budget', onClick: () => setIsFormOpen(true) }} />
      ) : (
        <div className="flex flex-col gap-2">
          {budgets.map(b => {
            const spent = categorySpending[b.category] ?? 0;
            const pct = Math.min((spent / b.limit) * 100, 100);
            const over = spent > b.limit;
            return (
              <GlassCard key={b.id} padding="sm" className={over ? 'border-danger/30' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-content-primary capitalize">{b.category}</p>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${over ? 'text-danger' : 'text-content-primary'}`}>{formatCurrency(spent, currency)}</span>
                    <span className="text-xs text-content-muted"> / {formatCurrency(b.limit, currency)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : '#7c3aed' }}
                  />
                </div>
                {over && <p className="text-xs text-danger mt-1">Over by {formatCurrency(spent - b.limit, currency)}</p>}
              </GlassCard>
            );
          })}
        </div>
      )}

      <BottomSheet open={isFormOpen} onClose={() => setIsFormOpen(false)} title="Set Monthly Budget">
        <div className="flex flex-col gap-4">
          <Select label="Category" value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)} options={categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Input label={`Limit (${currency})`} type="number" inputMode="decimal" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} placeholder="5000" autoFocus />
          <Button variant="primary" onClick={saveBudget} disabled={!budgetLimit}>Save Budget</Button>
        </div>
      </BottomSheet>
    </>
  );
}

function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    food: '🍔', groceries: '🛒', shopping: '🛍️', travel: '✈️', transport: '🚗',
    entertainment: '🎬', fitness: '💪', healthcare: '💊', bills: '📋',
    subscriptions: '📱', other: '💸', salary: '💼', freelance: '💻', investment: '📈',
  };
  return map[cat] || '💸';
}
