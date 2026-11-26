import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router-dom';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, Textarea, Input, Modal } from '../../components/ui';
import { useAnalytics } from '../../analytics/AnalyticsContext';
import { toast } from '../../stores/useToastStore';
import { autoCompleteHabits } from '../../utils/habitAutoComplete';
import { todayStr, formatDate } from '../../utils/dates';
import { format, subDays } from 'date-fns';
import type { JournalMood } from '../../db/schema';
import { BookOpen, Lightbulb, Search, Plus, Trash2, TrendingUp } from 'lucide-react';

const MOODS: { key: JournalMood; emoji: string; label: string; color: string }[] = [
  { key: 'great',    emoji: '😄', label: 'Great',    color: '#22c55e' },
  { key: 'good',     emoji: '😊', label: 'Good',     color: '#84cc16' },
  { key: 'okay',     emoji: '😐', label: 'Okay',     color: '#f59e0b' },
  { key: 'bad',      emoji: '😔', label: 'Bad',      color: '#f97316' },
  { key: 'terrible', emoji: '😞', label: 'Terrible', color: '#ef4444' },
];

export function JournalPage() {
  const [activeTab, setActiveTab] = useState<'entries' | 'reflect' | 'mood'>('entries');
  const location = useLocation();
  const [autoOpen] = useState(!!location.state?.autoOpen);

  useEffect(() => {
    if (location.state?.autoOpen) window.history.replaceState({}, '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Journal" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs
          tabs={[
            { id: 'entries', label: 'Journal',  icon: <BookOpen    size={12} /> },
            { id: 'reflect', label: 'Reflect',  icon: <Lightbulb   size={12} /> },
            { id: 'mood',    label: 'Mood',     icon: <TrendingUp  size={12} /> },
          ]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as any)}
          scrollable
        />
        {activeTab === 'entries' && <JournalEntries autoOpen={autoOpen} />}
        {activeTab === 'reflect' && <ThoughtAnalysis />}
        {activeTab === 'mood'    && <MoodStats />}
      </div>
    </div>
  );
}

function JournalEntries({ autoOpen = false }: { autoOpen?: boolean }) {
  const [isEditing, setIsEditing] = useState(autoOpen);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState(todayStr());
  const [mood, setMood] = useState<JournalMood | null>(null);
  const [freeText, setFreeText] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const { track } = useAnalytics();
  const [templateAnswers, setTemplateAnswers] = useState<Record<string, string>>({});
  const [gratitude, setGratitude] = useState(['', '', '']);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const entries = useLiveQuery(
    () => db.journalEntries.where('type').equals('entry').reverse().sortBy('date').then(r => r.slice(0, 50)),
    [], [],
  );

  const filtered = search
    ? (entries ?? []).filter(e =>
        e.freeText?.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(e.templateAnswers ?? {}).some(v => v?.toLowerCase().includes(search.toLowerCase()))
      )
    : (entries ?? []);

  const templatePrompts = [
    { key: 'wentWell', label: 'What went well today?' },
    { key: 'improved', label: 'What could I have done better?' },
    { key: 'learned', label: 'What did I learn today?' },
    { key: 'challenged', label: 'What challenged me?' },
    { key: 'grateful', label: 'What am I grateful for?' },
    { key: 'tomorrowPriority', label: "What is tomorrow's priority?" },
  ];

  const openEdit = (id?: number) => {
    if (id) {
      db.journalEntries.get(id).then(e => {
        if (!e) return;
        setEditingId(id);
        setEditDate(e.date);
        setMood(e.mood ?? null);
        setFreeText(e.freeText ?? '');
        setTemplateAnswers(e.templateAnswers ?? {});
        setGratitude(e.gratitude?.length === 3 ? e.gratitude : ['', '', '']);
        setUseTemplate(!!(e.templateAnswers && Object.values(e.templateAnswers).some(v => v)));
      });
    } else {
      setEditingId(null); setEditDate(todayStr()); setMood(null);
      setFreeText(''); setTemplateAnswers({}); setGratitude(['', '', '']);
      setUseTemplate(false);
    }
    setIsEditing(true);
  };

  const saveEntry = async () => {
    const hasContent = freeText.trim() || Object.values(templateAnswers).some(v => v?.trim()) || gratitude.some(g => g.trim()) || mood;
    if (!hasContent) { toast.error('Add some content before saving'); return; }
    const wordCount = freeText.trim().split(/\s+/).filter(Boolean).length;
    const now = new Date().toISOString();
    const data = {
      date: editDate, type: 'entry' as const, freeText: freeText.trim() || undefined,
      templateAnswers: useTemplate ? templateAnswers : undefined,
      mood: mood ?? undefined,
      gratitude: gratitude.filter(g => g.trim()),
      wordCount, updatedAt: now,
    };
    if (editingId) {
      await db.journalEntries.update(editingId, data);
      toast.success('Entry updated!');
    } else {
      await db.journalEntries.add({ ...data, createdAt: now });
      track('journal_entry_created', { entry_type: data.type as string, has_mood: !!mood });
      toast.success('Entry saved!');
      // Auto-complete journaling/reflection habits
      autoCompleteHabits('journal').then(done => {
        if (done.length) toast.success(`Habit${done.length > 1 ? 's' : ''} auto-done: ${done.join(', ')}`);
      });
    }
    setIsEditing(false);
  };

  const deleteEntry = async () => {
    if (!deletingId) return;
    await db.journalEntries.delete(deletingId);
    setDeletingId(null);
    toast.success('Entry deleted');
  };

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => setShowSearch(!showSearch)} className="p-2 glass-1 rounded-input text-content-muted hover:text-content-primary">
          <Search size={16} />
        </button>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => openEdit()} className="flex-1">New Entry</Button>
      </div>

      {showSearch && (
        <Input placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      )}

      {!filtered.length ? (
        <EmptyState icon={<BookOpen size={24} />} title="No journal entries" subtitle="Start journaling for self-awareness" action={{ label: 'Write Today', onClick: () => openEdit() }} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(entry => {
            const moodData = MOODS.find(m => m.key === entry.mood);
            const preview = entry.freeText || Object.values(entry.templateAnswers ?? {}).find(v => v) || '';
            return (
              <GlassCard key={entry.id} padding="sm" variant="interactive" onClick={() => openEdit(entry.id)}>
                <div className="flex items-start gap-3">
                  <div className="text-xl shrink-0">{moodData?.emoji ?? '📝'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-content-secondary">{formatDate(entry.date)}</p>
                      {moodData && <span className="text-xs text-content-muted">{moodData.label}</span>}
                      {entry.wordCount && <span className="text-xs text-content-muted">{entry.wordCount}w</span>}
                    </div>
                    <p className="text-sm text-content-primary line-clamp-2">{preview || 'Tap to view…'}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setDeletingId(entry.id!); }} className="p-1.5 glass-1 rounded text-content-muted hover:text-danger shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title={editingId ? 'Edit Entry' : 'New Journal Entry'} snapPoints>
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />

          {/* Mood */}
          <div>
            <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Mood</label>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMood(mood === m.key ? null : m.key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-input transition-all ${mood === m.key ? 'glass-elevated ring-1 ring-accent' : 'glass-1'}`}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[9px] text-content-muted">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <Textarea label="Thoughts" value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="What's on your mind today?" rows={4} />

          {/* Gratitude */}
          <div>
            <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Grateful for</label>
            {[0, 1, 2].map(i => (
              <Input
                key={i}
                placeholder={`${i + 1}. I'm grateful for…`}
                value={gratitude[i]}
                onChange={e => { const g = [...gratitude]; g[i] = e.target.value; setGratitude(g); }}
                wrapperClassName="mb-2"
              />
            ))}
          </div>

          {/* Template toggle */}
          <button
            onClick={() => setUseTemplate(!useTemplate)}
            className={`text-xs font-medium py-2 px-3 rounded-input transition-all ${useTemplate ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}
          >
            {useTemplate ? '✓ Reflection template active' : 'Use reflection template'}
          </button>

          {useTemplate && (
            <div className="flex flex-col gap-3">
              {templatePrompts.map(p => (
                <Textarea
                  key={p.key}
                  label={p.label}
                  value={templateAnswers[p.key] ?? ''}
                  onChange={e => setTemplateAnswers(prev => ({ ...prev, [p.key]: e.target.value }))}
                  rows={2}
                />
              ))}
            </div>
          )}

          <Button variant="primary" onClick={saveEntry}>Save Entry</Button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete entry?" size="sm">
        <p className="text-sm text-content-secondary mb-4">This cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={deleteEntry}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}

function ThoughtAnalysis() {
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const { track } = useAnalytics();

  const analyses = useLiveQuery(
    () => db.journalEntries.where('type').equals('thought-analysis').reverse().sortBy('date').then(r => r.slice(0, 20)),
    [], [],
  );

  const prompts = [
    { key: 'situation', label: 'Situation', placeholder: 'What actually happened? Describe it objectively.' },
    { key: 'facts', label: 'Facts', placeholder: 'What do you know for certain? List only verifiable facts.' },
    { key: 'assumptions', label: 'Assumptions', placeholder: "What are you interpreting? What might not be true?" },
    { key: 'emotions', label: 'Emotions', placeholder: 'What are you feeling right now? Name them without judgment.' },
    { key: 'control', label: 'Control', placeholder: "What is within your control? What isn't?" },
    { key: 'action', label: 'Action', placeholder: 'What is the wisest next step you could take?' },
  ];

  const saveAnalysis = async () => {
    const now = new Date().toISOString();
    await db.journalEntries.add({
      date: todayStr(), type: 'thought-analysis',
      thoughtAnalysis: fields, createdAt: now, updatedAt: now,
    });
    track('journal_entry_created', { entry_type: 'thought-analysis', has_mood: false });
    toast.success('Reflection saved!');
    setIsEditing(false);
    setFields({});
  };

  return (
    <>
      <GlassCard className="border-accent/20">
        <p className="text-sm font-semibold text-content-primary mb-2">Structured Reflection</p>
        <p className="text-xs text-content-secondary leading-relaxed mb-3">
          A CBT-inspired framework to process difficult thoughts. Work through each step to find clarity and your wisest next action.
        </p>
        <Button variant="primary" onClick={() => setIsEditing(true)} fullWidth>Start Reflection</Button>
      </GlassCard>

      {!analyses?.length ? (
        <EmptyState icon={<Lightbulb size={24} />} title="No reflections yet" subtitle="Use structured thinking to gain clarity" compact />
      ) : (
        <div className="flex flex-col gap-2">
          {analyses.map(a => (
            <GlassCard key={a.id} padding="sm">
              <p className="text-xs text-content-muted mb-1">{formatDate(a.date)}</p>
              <p className="text-sm text-content-primary line-clamp-2">{a.thoughtAnalysis?.situation || 'Thought analysis'}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title="Structured Reflection" snapPoints>
        <div className="flex flex-col gap-4">
          {prompts.map(p => (
            <Textarea
              key={p.key}
              label={p.label}
              value={fields[p.key] ?? ''}
              onChange={e => setFields(prev => ({ ...prev, [p.key]: e.target.value }))}
              placeholder={p.placeholder}
              rows={3}
            />
          ))}
          <Button variant="primary" onClick={saveAnalysis}>Save Reflection</Button>
        </div>
      </BottomSheet>
    </>
  );
}


// ─── Mood Stats ───────────────────────────────────────────────
// 30-day mood calendar + distribution breakdown

const MOOD_ORDER: JournalMood[] = ['great', 'good', 'okay', 'bad', 'terrible'];

function MoodStats() {
  const now = new Date();

  const entries = useLiveQuery(
    () => db.journalEntries
      .where('type').equals('entry')
      .filter(e => !!e.mood)
      .toArray(),
    [], [],
  );

  if (!(entries ?? []).length) {
    return (
      <EmptyState
        icon={<TrendingUp size={24} />}
        title="No mood data yet"
        subtitle="Set a mood when writing journal entries to see your trends here."
      />
    );
  }

  // ── 30-day calendar ───────────────────────────────────────
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d       = subDays(now, 29 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const entry   = (entries ?? []).find(e => e.date === dateStr);
    const moodCfg = entry?.mood ? MOODS.find(m => m.key === entry.mood) : null;
    return { dateStr, moodCfg, dayLabel: format(d, 'd') };
  });

  // ── Distribution ──────────────────────────────────────────
  const moodCounts: Partial<Record<JournalMood, number>> = {};
  (entries ?? []).forEach(e => {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  });
  const total = Object.values(moodCounts).reduce((s, v) => s + v, 0);

  // ── Trend: last 7 avg vs prior 7 ─────────────────────────
  const moodScore = (m?: JournalMood) => {
    if (!m) return null;
    const scores: Record<JournalMood, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
    return scores[m];
  };

  const last7  = days30.slice(23).map(d => moodScore(d.moodCfg?.key as JournalMood)).filter((v): v is number => v !== null);
  const prior7 = days30.slice(16, 23).map(d => moodScore(d.moodCfg?.key as JournalMood)).filter((v): v is number => v !== null);
  const avg7   = last7.length  ? (last7.reduce((s, v)  => s + v, 0) / last7.length).toFixed(1)  : null;
  const avg7p  = prior7.length ? (prior7.reduce((s, v) => s + v, 0) / prior7.length).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-3">

      {/* 30-day mood calendar */}
      <GlassCard>
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
          Last 30 Days
        </p>
        <div className="flex flex-wrap gap-1.5">
          {days30.map(({ dateStr, moodCfg, dayLabel }) => (
            <div
              key={dateStr}
              title={`${dateStr}${moodCfg ? ` — ${moodCfg.label}` : ''}`}
              className="flex flex-col items-center gap-0.5"
              style={{ width: 24 }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{
                  backgroundColor: moodCfg ? `${moodCfg.color}30` : 'rgba(255,255,255,0.03)',
                  border:          moodCfg ? `1px solid ${moodCfg.color}60` : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {moodCfg ? moodCfg.emoji : ''}
              </div>
              <span className="text-[8px] text-content-muted">{dayLabel}</span>
            </div>
          ))}
        </div>

        {/* 7-day trend */}
        {avg7 && avg7p && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-3">
            <p className="text-xs text-content-muted flex-1">7-day mood average</p>
            <span className="text-sm font-bold text-content-primary">{avg7}/5</span>
            <span className={`text-xs ${parseFloat(avg7) >= parseFloat(avg7p) ? 'text-success' : 'text-danger'}`}>
              {parseFloat(avg7) >= parseFloat(avg7p) ? '↑' : '↓'} vs prior week ({avg7p})
            </span>
          </div>
        )}
      </GlassCard>

      {/* Distribution */}
      <GlassCard>
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
          Mood Distribution ({total} entries)
        </p>
        <div className="flex flex-col gap-2">
          {MOOD_ORDER.filter(m => moodCounts[m]).map(mood => {
            const cfg  = MOODS.find(m => m.key === mood)!;
            const cnt  = moodCounts[mood] ?? 0;
            const pct  = total > 0 ? Math.round((cnt / total) * 100) : 0;
            return (
              <div key={mood} className="flex items-center gap-3">
                <span className="text-base w-7">{cfg.emoji}</span>
                <span className="text-xs text-content-secondary w-16">{cfg.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                  />
                </div>
                <span className="text-xs text-content-muted w-10 text-right">{cnt}× ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
