import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { parseQuickAdd, type QuickAddResult } from '../../utils/quickAdd';
import { toast } from '../../stores/useToastStore';
import { useSetting } from '../../hooks/useSetting';
import { todayStr } from '../../utils/dates';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Autocomplete suggestion type ────────────────────────────
interface Suggestion {
  description: string;
  amount: number;
  category: string;
}

// ─── Component ────────────────────────────────────────────────
interface QuickAddBarProps {
  /** Pre-filled value from an iOS Shortcut deep link (?q=...) */
  initialValue?: string;
}

export function QuickAddBar({ initialValue }: QuickAddBarProps) {
  const [input, setInput]       = useState('');
  const [parsed, setParsed]     = useState<QuickAddResult | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading]   = useState(false);

  const inputRef   = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from iOS Shortcut deep link
  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      setIsActive(true);
      // Small delay so the parse fires after the value is set
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const [currency] = useSetting('currency', 'INR');
  const symbol = currency === 'INR' ? '₹' : '$';

  // Active habit names for habit-completion parsing
  const habitNames = useLiveQuery(
    () => db.habits.filter(h => !!h.isActive).toArray().then(h => h.map(x => x.name)),
    [],
    [],
  ) ?? [];

  // Autocomplete — recent unique expense descriptions matching current input
  const suggestions = useLiveQuery<Suggestion[]>(async () => {
    if (!input || input.length < 2) return [];
    const lower = input.toLowerCase();
    const recent = await db.transactions
      .where('type').equals('expense')
      .reverse()
      .limit(80)
      .toArray();

    const seen    = new Set<string>();
    const matches: Suggestion[] = [];

    for (const t of recent) {
      if (!t.description) continue;
      const key = t.description.toLowerCase();
      if (key.startsWith(lower) && !seen.has(key)) {
        seen.add(key);
        matches.push({ description: t.description, amount: t.amount, category: t.category });
        if (matches.length >= 3) break;
      }
    }
    return matches;
  }, [input]) ?? [];

  // ── Debounced parser (150ms) ────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!input.trim()) { setParsed(null); return; }
      const result = parseQuickAdd(input, { habitNames: habitNames ?? [], currency });
      setParsed(result);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, habitNames, currency]);

  // ── Save handler ────────────────────────────────────────
  const handleSave = useCallback(async (resultOverride?: QuickAddResult) => {
    const result = resultOverride ?? parsed;
    if (!result || loading) return;
    setLoading(true);

    try {
      const now = new Date().toISOString();

      switch (result.type) {

        case 'expense':
        case 'income':
          await db.transactions.add({
            type: result.data.transactionType ?? 'expense',
            amount: result.data.amount!,
            currency,
            date: todayStr(),
            category: result.data.category ?? 'other',
            paymentMethod: 'upi',
            description: result.data.description,
            isRecurring: false,
            createdAt: now,
            updatedAt: now,
          });
          break;

        case 'task':
          await db.tasks.add({
            title: result.data.title!,
            dueDate: result.data.dueDate,
            dueTime: result.data.dueTime,
            priority: result.data.priority ?? 'medium',
            category: (result.data.taskCategory ?? 'personal') as any,
            status: 'pending',
            isRecurring: false,
            createdAt: now,
            updatedAt: now,
          });
          break;

        case 'habit_complete': {
          const habit = await db.habits
            .filter(h => h.name.toLowerCase() === (result.data.habitName ?? '').toLowerCase())
            .first();
          if (habit?.id) {
            const exists = await db.habitCompletions
              .where({ habitId: habit.id, date: todayStr() })
              .first();
            if (!exists) {
              await db.habitCompletions.add({
                habitId: habit.id,
                date: todayStr(),
                completedAt: now,
              });
              if (navigator.vibrate) navigator.vibrate(10);
            }
          }
          break;
        }

        case 'weight':
          await db.bodyMeasurements.add({
            date: todayStr(),
            type: 'weight',
            value: result.data.bodyValue!,
            unit: result.data.bodyUnit ?? 'kg',
            createdAt: now,
          });
          break;

        case 'water': {
          const existing = await db.nutritionLogs.where('date').equals(todayStr()).first();
          const ml = result.data.waterMl ?? 250;
          if (existing?.id) {
            await db.nutritionLogs.update(existing.id, {
              waterMl: (existing.waterMl ?? 0) + ml,
              updatedAt: now,
            });
          } else {
            await db.nutritionLogs.add({
              date: todayStr(),
              meals: [],
              waterMl: ml,
              createdAt: now,
              updatedAt: now,
            });
          }
          break;
        }

        case 'note':
          await db.journalEntries.add({
            date: todayStr(),
            type: 'entry',
            freeText: result.data.noteText,
            wordCount: (result.data.noteText ?? '').split(/\s+/).filter(Boolean).length,
            createdAt: now,
            updatedAt: now,
          });
          break;
      }

      toast.success(result.preview);
      setInput('');
      setParsed(null);
      setIsActive(false);
      inputRef.current?.blur();

    } catch {
      toast.error('Could not save — please try again');
    } finally {
      setLoading(false);
    }
  }, [parsed, currency, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && parsed && !loading) { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') {
      setInput('');
      setParsed(null);
      setIsActive(false);
      inputRef.current?.blur();
    }
  };

  const applySuggestion = (s: Suggestion) => {
    // Fill input with the suggestion and immediately trigger parse
    const filled = `${s.description} ${s.amount}`;
    setInput(filled);
    inputRef.current?.focus();
  };

  const clear = () => {
    setInput('');
    setParsed(null);
    inputRef.current?.focus();
  };

  const showSuggestions = isActive && Array.isArray(suggestions) && suggestions.length > 0 && input.length >= 2;

  return (
    <div className="flex flex-col gap-2">

      {/* ── Input pill ──────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-pill transition-all duration-300',
          isActive ? 'glass-2' : 'glass-1',
        )}
      >
        {/* Animated icon — shows parsed emoji or sparkles */}
        <span
          className="text-base shrink-0 transition-all duration-200 select-none"
          style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(139,71,255,0.6))' : 'none' }}
        >
          {parsed ? parsed.emoji : <Sparkles size={18} className="text-accent opacity-70" />}
        </span>

        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setIsActive(true)}
          onBlur={() => { if (!input.trim()) setIsActive(false); }}
          onKeyDown={handleKeyDown}
          placeholder={`lunch 450  ·  call mom tomorrow  ·  done gym`}
          className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-dim outline-none min-w-0"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Quick add — type in plain English"
        />

        {input && (
          <button
            onClick={clear}
            className="text-content-muted hover:text-content-secondary transition-colors shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.06]"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Autocomplete suggestions ─────────────────────── */}
      {showSuggestions && !parsed && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1">
          {(suggestions as Suggestion[]).map((s, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
              className="flex items-center gap-2 px-3 py-2 glass-1 hover:glass-2 rounded-pill text-xs whitespace-nowrap shrink-0 transition-all active:scale-95"
            >
              <span className="text-content-muted capitalize">{s.category}</span>
              <span className="text-content-secondary font-medium">{s.description}</span>
              <span className="text-accent font-semibold">{symbol}{s.amount.toLocaleString('en-IN')}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Live preview card ─────────────────────────────── */}
      {parsed && (
        <button
          onMouseDown={e => { e.preventDefault(); handleSave(); }}
          onClick={() => handleSave()}
          disabled={loading}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-card text-left',
            'transition-all duration-200 active:scale-[0.98] hover:glass-2',
            'glass-1 animate-fade-in',
            loading && 'opacity-60 pointer-events-none',
          )}
          style={{
            borderColor: `${parsed.color}30`,
            borderTopColor: `${parsed.color}55`,
          }}
        >
          {/* Type icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
            style={{
              background: `${parsed.color}1e`,
              border: `1px solid ${parsed.color}44`,
              borderTopColor: `${parsed.color}70`,
            }}
          >
            {parsed.emoji}
          </div>

          {/* Preview text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-content-primary truncate">
              {parsed.preview}
            </p>
            <p className="text-[11px] text-content-muted mt-0.5">
              {loading ? 'Saving…' : 'Tap to save · Enter ↵'}
            </p>
          </div>

          {/* Confidence indicator + arrow */}
          <div className="flex items-center gap-2 shrink-0">
            {parsed.confidence === 'low' && (
              <span className="text-[10px] text-warning/80 font-medium">low confidence</span>
            )}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: `${parsed.color}25` }}
            >
              <ArrowRight size={13} style={{ color: parsed.color }} />
            </div>
          </div>
        </button>
      )}

    </div>
  );
}
