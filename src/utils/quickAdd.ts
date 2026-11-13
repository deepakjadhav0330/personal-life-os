/**
 * quickAdd.ts — Natural Language Parser
 * ─────────────────────────────────────
 * Pure function: no React, no Dexie, no side effects.
 * Takes a plain-text string and returns a structured QuickAddResult.
 *
 * Supported patterns (examples):
 *   "lunch 450"              → expense ₹450, Food
 *   "netflix 649"            → expense ₹649, Subscriptions
 *   "salary 85000"           → income ₹85,000
 *   "call mom tomorrow high" → task, high priority, due tomorrow
 *   "weight 78.5"            → body measurement
 *   "water 500"              → nutrition log 500ml water
 *   "done gym"               → habit completion (matches active habits)
 *   "note feeling great"     → quick journal note
 */

import {
  format, addDays,
  nextMonday, nextTuesday, nextWednesday,
  nextThursday, nextFriday, nextSaturday, nextSunday,
  parseISO,
} from 'date-fns';

// ─── Public types ─────────────────────────────────────────────

export type QuickAddType =
  | 'expense'
  | 'income'
  | 'task'
  | 'habit_complete'
  | 'weight'
  | 'water'
  | 'note';

export interface QuickAddResult {
  type: QuickAddType;
  confidence: 'high' | 'medium' | 'low';
  /** Short human-readable summary shown in the preview card */
  preview: string;
  emoji: string;
  color: string;
  data: QuickAddData;
}

export interface QuickAddData {
  // Finance
  amount?: number;
  category?: string;
  description?: string;
  paymentMethod?: string;
  transactionType?: 'expense' | 'income';
  // Task
  title?: string;
  dueDate?: string;   // YYYY-MM-DD
  dueTime?: string;   // HH:MM
  priority?: 'high' | 'medium' | 'low';
  taskCategory?: string;
  // Habit
  habitName?: string;
  // Body
  bodyValue?: number;
  bodyUnit?: string;
  // Water
  waterMl?: number;
  // Note
  noteText?: string;
}

// ─── Keyword tables ───────────────────────────────────────────

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  food: [
    'lunch', 'dinner', 'breakfast', 'brunch', 'coffee', 'tea', 'chai',
    'restaurant', 'cafe', 'meal', 'eat', 'ate', 'food', 'zomato', 'swiggy',
    'pizza', 'burger', 'noodles', 'biryani', 'thali', 'snack', 'juice',
    'milkshake', 'dosa', 'idli', 'paratha', 'maggi', 'dominos', 'kfc',
    'mcdonalds', 'subway',
  ],
  groceries: [
    'grocery', 'groceries', 'vegetables', 'veggies', 'fruits', 'milk',
    'eggs', 'rice', 'dal', 'atta', 'bigbasket', 'blinkit', 'zepto', 'dmart',
    'supermarket', 'kirana', 'sabzi', 'reliance fresh', 'more',
  ],
  transport: [
    'uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'taxi', 'cab', 'auto',
    'rickshaw', 'petrol', 'fuel', 'diesel', 'parking', 'toll', 'irctc',
    'redbus', 'namma metro', 'bmtc',
  ],
  subscriptions: [
    'netflix', 'spotify', 'amazon prime', 'prime', 'hotstar', 'zee5',
    'subscription', 'youtube', 'icloud', 'google one', 'notion', 'figma',
    'chatgpt', 'openai', 'adobe', 'canva', 'jio cinema', 'sonyliv',
    'mxplayer', 'crunchyroll', 'discord', 'dropbox',
  ],
  fitness: [
    'gym', 'protein', 'supplement', 'creatine', 'yoga', 'fitness',
    'crossfit', 'cult', 'whey', 'bcaa', 'pre workout',
  ],
  healthcare: [
    'medicine', 'medicines', 'doctor', 'hospital', 'pharmacy', 'chemist',
    'medical', 'health', 'clinic', 'dentist', 'apollo', 'netmeds', '1mg',
    'pharmeasy', 'scan', 'lab test',
  ],
  bills: [
    'electricity', 'water bill', 'gas', 'internet', 'wifi', 'broadband',
    'mobile', 'phone', 'bill', 'recharge', 'bsnl', 'jio', 'airtel', 'vi',
    'tata sky', 'dth', 'postpaid', 'prepaid', 'housekeeping', 'rent',
    'maintenance',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'clothes', 'shoes', 'clothing',
    'shopping', 'meesho', 'nykaa', 'purplle', 'firstcry', 'tshirt', 'jeans',
  ],
  entertainment: [
    'movie', 'cinema', 'pvr', 'inox', 'concert', 'event', 'game',
    'bookmyshow', 'gaming', 'playstation', 'xbox',
  ],
  travel: [
    'flight', 'hotel', 'trip', 'booking', 'airbnb', 'makemytrip', 'yatra',
    'oyo', 'goibibo', 'cleartrip', 'holiday', 'vacation',
  ],
};

const INCOME_KEYWORDS = [
  'salary', 'income', 'earned', 'received', 'payment', 'freelance',
  'project', 'bonus', 'dividend', 'rent received', 'interest', 'refund',
  'stipend', 'commission', 'consulting', 'paid',
];

const TASK_VERBS = [
  'call', 'email', 'send', 'buy', 'get', 'meet', 'meeting', 'review',
  'check', 'update', 'fix', 'schedule', 'prepare', 'submit', 'book', 'plan',
  'read', 'write', 'complete', 'finish', 'attend', 'visit', 'pick', 'drop',
  'pay', 'remind', 'follow', 'reply', 'draft', 'research', 'study',
  'practice', 'clean', 'organise', 'organize', 'cancel', 'confirm',
  'apply', 'register', 'renew', 'return', 'collect', 'order', 'track',
];

const TASK_NOUNS = ['task', 'todo', 'to-do', 'reminder'];

const HIGH_PRIORITY = ['urgent', 'asap', 'high', 'important', 'critical', '!!'];
const LOW_PRIORITY  = ['low', 'someday', 'maybe', 'eventually', 'whenever'];

const HABIT_DONE = ['done', 'completed', 'finished', 'did', 'checked', 'complete', 'tick'];

const WEIGHT_WORDS = ['weight', 'weighed', 'kg', 'kgs', 'kilos', 'lbs', 'pounds'];
const WATER_WORDS  = ['water', 'drank', 'ml', 'liters', 'litres', 'glass', 'glasses', 'hydration'];
const NOTE_WORDS   = ['note', 'journal', 'diary', 'thought', 'feeling', 'memo', 'quick note', 'write', 'log'];

const DATE_WORDS = ['today','tomorrow','monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

// ─── Internal helpers ─────────────────────────────────────────

function extractAmount(tokens: string[]): number | undefined {
  for (const t of tokens) {
    const clean = t.replace(/[₹$€£,k]/gi, s => s.toLowerCase() === 'k' ? '000' : '');
    const n = parseFloat(clean);
    if (!isNaN(n) && n > 0 && n < 10_000_000) return n;
  }
  return undefined;
}

function detectExpenseCategory(input: string): string {
  const lower = input.toLowerCase();
  for (const [cat, keywords] of Object.entries(EXPENSE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'other';
}

function detectIncomeCategory(lower: string): string {
  if (lower.includes('salary') || lower.includes('payroll') || lower.includes('stipend')) return 'salary';
  if (lower.includes('freelance') || lower.includes('project') || lower.includes('consulting')) return 'freelance';
  if (lower.includes('dividend') || lower.includes('interest') || lower.includes('investment')) return 'investment';
  return 'other';
}

function extractDate(tokens: string[]): { date?: string; time?: string } {
  const today = new Date();
  let date: string | undefined;
  let time: string | undefined;

  for (const token of tokens) {
    const t = token.toLowerCase();
    if (t === 'today')     { date = format(today, 'yyyy-MM-dd'); continue; }
    if (t === 'tomorrow')  { date = format(addDays(today, 1), 'yyyy-MM-dd'); continue; }
    if (t === 'monday')    { date = format(nextMonday(today),    'yyyy-MM-dd'); continue; }
    if (t === 'tuesday')   { date = format(nextTuesday(today),   'yyyy-MM-dd'); continue; }
    if (t === 'wednesday') { date = format(nextWednesday(today), 'yyyy-MM-dd'); continue; }
    if (t === 'thursday')  { date = format(nextThursday(today),  'yyyy-MM-dd'); continue; }
    if (t === 'friday')    { date = format(nextFriday(today),    'yyyy-MM-dd'); continue; }
    if (t === 'saturday')  { date = format(nextSaturday(today),  'yyyy-MM-dd'); continue; }
    if (t === 'sunday')    { date = format(nextSunday(today),    'yyyy-MM-dd'); continue; }

    // Time: 7pm, 8am, 10:30, 10:30am
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
    if (m) {
      let h = parseInt(m[1]);
      const mins = m[2] ? parseInt(m[2]) : 0;
      if (m[3] === 'pm' && h < 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && mins >= 0 && mins <= 59) {
        time = `${String(h).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      }
    }
  }

  return { date, time };
}

function extractPriority(lower: string): 'high' | 'medium' | 'low' {
  if (HIGH_PRIORITY.some(w => lower.includes(w))) return 'high';
  if (LOW_PRIORITY.some(w => lower.includes(w)))  return 'low';
  return 'medium';
}

function matchHabit(input: string, habitNames: string[]): string | undefined {
  if (!habitNames.length) return undefined;
  const lower = input.toLowerCase();
  // Remove trigger words to isolate the habit name
  let cleaned = HABIT_DONE.reduce((s, kw) => s.replace(new RegExp(`\\b${kw}\\b`, 'gi'), ''), lower).trim();

  if (!cleaned) return undefined;

  // Exact or partial match
  return (
    habitNames.find(n => n.toLowerCase() === cleaned) ??
    habitNames.find(n => n.toLowerCase().includes(cleaned)) ??
    habitNames.find(n => cleaned.includes(n.toLowerCase()))
  );
}

function buildTaskTitle(tokens: string[], excludeLower: Set<string>): string {
  return tokens
    .filter(t => !excludeLower.has(t.toLowerCase()))
    .filter(t => !HIGH_PRIORITY.includes(t.toLowerCase()))
    .filter(t => !LOW_PRIORITY.includes(t.toLowerCase()))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dateLabel(dateStr: string): string {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === todayStr)    return 'today';
  if (dateStr === tomorrowStr) return 'tomorrow';
  try { return format(parseISO(dateStr), 'EEE d MMM'); } catch { return dateStr; }
}

function nonNumericDescription(tokens: string[]): string {
  return tokens
    .filter(t => {
      const clean = t.replace(/[₹$€£,]/g, '');
      return isNaN(parseFloat(clean));
    })
    .filter(t => !DATE_WORDS.includes(t.toLowerCase()))
    .join(' ')
    .trim();
}

// ─── Main exported parser ─────────────────────────────────────

export function parseQuickAdd(
  input: string,
  context: { habitNames: string[]; currency: string } = { habitNames: [], currency: 'INR' },
): QuickAddResult | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const tokens  = trimmed.split(/\s+/);
  const lower   = trimmed.toLowerCase();
  const first   = tokens[0].toLowerCase();
  const amount  = extractAmount(tokens);
  const symbol  = context.currency === 'INR' ? '₹' : '$';
  const { date, time } = extractDate(tokens);

  // ── 1. Habit completion ─────────────────────────────────
  if (HABIT_DONE.includes(first) && tokens.length >= 2) {
    const habit = matchHabit(lower, context.habitNames);
    if (habit) {
      return {
        type: 'habit_complete',
        confidence: 'high',
        preview: `Mark "${habit}" as done today`,
        emoji: '✅',
        color: '#22c55e',
        data: { habitName: habit },
      };
    }
  }

  // ── 2. Water ────────────────────────────────────────────
  if (WATER_WORDS.some(kw => lower.includes(kw))) {
    let ml = 250;
    if (amount) {
      if (lower.includes('glass'))                           ml = amount * 250;
      else if (lower.includes('liter') || lower.includes('litre')) ml = amount * 1000;
      else                                                   ml = amount;
    } else if (lower.includes('glass')) ml = 250;
    return {
      type: 'water',
      confidence: amount ? 'high' : 'medium',
      preview: `Log ${ml}ml water 💧`,
      emoji: '💧',
      color: '#3b82f6',
      data: { waterMl: ml },
    };
  }

  // ── 3. Weight ───────────────────────────────────────────
  if (amount && WEIGHT_WORDS.some(kw => lower.includes(kw))) {
    const isLbs = lower.includes('lb') || lower.includes('pound');
    return {
      type: 'weight',
      confidence: 'high',
      preview: `Log weight: ${amount}${isLbs ? ' lbs' : ' kg'}`,
      emoji: '⚖️',
      color: '#8b5cf6',
      data: { bodyValue: amount, bodyUnit: isLbs ? 'lbs' : 'kg' },
    };
  }

  // Weight without keyword if single number in typical range (40–200)
  if (tokens.length === 1 && amount && amount >= 40 && amount <= 200) {
    return {
      type: 'weight',
      confidence: 'low',
      preview: `Log weight: ${amount} kg`,
      emoji: '⚖️',
      color: '#8b5cf6',
      data: { bodyValue: amount, bodyUnit: 'kg' },
    };
  }

  // ── 4. Income ───────────────────────────────────────────
  if (amount && INCOME_KEYWORDS.some(kw => lower.includes(kw))) {
    const desc = nonNumericDescription(tokens) || undefined;
    return {
      type: 'income',
      confidence: 'high',
      preview: `Add ${symbol}${amount.toLocaleString('en-IN')} income${desc ? ` · ${desc}` : ''}`,
      emoji: '📈',
      color: '#22c55e',
      data: { amount, transactionType: 'income', description: desc, category: detectIncomeCategory(lower) },
    };
  }

  // ── 5. Expense (amount present, not income) ─────────────
  if (amount) {
    const category = detectExpenseCategory(lower);
    const desc     = nonNumericDescription(tokens) || undefined;
    const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
    return {
      type: 'expense',
      confidence: desc ? 'high' : 'medium',
      preview: `Add ${symbol}${amount.toLocaleString('en-IN')} · ${catLabel}${desc ? ` · ${desc}` : ''}`,
      emoji: '💸',
      color: '#f59e0b',
      data: { amount, category, description: desc, transactionType: 'expense' },
    };
  }

  // ── 6. Note keyword ─────────────────────────────────────
  if (NOTE_WORDS.some(kw => lower.startsWith(kw + ' '))) {
    const text = tokens.slice(1).join(' ').trim() || trimmed;
    return {
      type: 'note',
      confidence: 'high',
      preview: `Save note: "${text.slice(0, 48)}${text.length > 48 ? '…' : ''}"`,
      emoji: '📝',
      color: '#8b5cf6',
      data: { noteText: text },
    };
  }

  // ── 7. Task — action verb or task/todo keyword ──────────
  if (TASK_VERBS.includes(first) || TASK_NOUNS.includes(first) || lower.startsWith('remind me')) {
    const priority = extractPriority(lower);
    const dateSet  = new Set(DATE_WORDS);
    const excludes = new Set([
      ...(TASK_NOUNS.includes(first) ? [first] : []),
      ...Array.from(dateSet),
      ...HIGH_PRIORITY,
      ...LOW_PRIORITY,
    ]);
    const title      = buildTaskTitle(tokens, excludes) || trimmed;
    const dateStr    = date ? ` · ${dateLabel(date)}` : '';
    const priorityStr= priority !== 'medium' ? ` · ${priority}` : '';
    return {
      type: 'task',
      confidence: 'high',
      preview: `Add task: "${title}"${dateStr}${priorityStr}`,
      emoji: '☑',
      color: '#6366f1',
      data: { title, dueDate: date, dueTime: time, priority, taskCategory: 'personal' },
    };
  }

  // ── 8. Fallback: multi-word without amount → note ───────
  if (tokens.length >= 4) {
    return {
      type: 'note',
      confidence: 'low',
      preview: `Save note: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '…' : ''}"`,
      emoji: '📝',
      color: '#8b5cf6',
      data: { noteText: trimmed },
    };
  }

  return null;
}
