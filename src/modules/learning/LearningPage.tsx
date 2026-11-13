import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  GlassCard, Button, Tabs, EmptyState, BottomSheet,
  Badge, ProgressBar, Input, Textarea, Modal,
} from '../../components/ui';
import { toast } from '../../stores/useToastStore';
import { todayStr, formatDate } from '../../utils/dates';
import { formatMinutes } from '../../utils/format';
import type { LearningItem, LearningItemType, LearningStatus } from '../../db/schema';
import { BookOpen, GraduationCap, Zap, Plus, Clock, Edit3, Trash2 } from 'lucide-react';
import { IconButton } from '../../components/ui';

const TYPE_CONFIG = {
  book:   { icon: BookOpen,       label: 'Book',   color: '#f59e0b' },
  course: { icon: GraduationCap,  label: 'Course', color: '#6366f1' },
  skill:  { icon: Zap,            label: 'Skill',  color: '#22c55e' },
};

const COVER_COLORS = ['#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];

export function LearningPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<LearningItemType | 'all'>('all');

  const items = useLiveQuery(
    () => db.learningItems
      .where('status').anyOf(activeTab === 'active' ? ['active', 'paused'] : ['completed'])
      .sortBy('createdAt')
      .then(r => [...r].reverse()),
    [activeTab], [],
  );

  const allSessions = useLiveQuery(() => db.learningSessions.toArray(), [], []);

  const totalHours = allSessions
    ? Math.round(allSessions.reduce((s, l) => s + l.durationMinutes, 0) / 60 * 10) / 10
    : 0;

  const thisWeekHours = (() => {
    const start = new Date(); start.setDate(start.getDate() - 7);
    const startStr = start.toISOString().slice(0, 10);
    const weekSessions = allSessions?.filter(s => s.date >= startStr) ?? [];
    return Math.round(weekSessions.reduce((s, l) => s + l.durationMinutes, 0) / 60 * 10) / 10;
  })();

  const filtered = filterType === 'all'
    ? (items ?? [])
    : (items ?? []).filter(i => i.type === filterType);

  async function deleteItem() {
    if (!deletingId) return;
    try {
      await db.learningSessions.where('learningItemId').equals(deletingId).delete();
      await db.learningItems.delete(deletingId);
      setDeletingId(null);
      toast.success('Item deleted');
    } catch { toast.error('Could not delete'); }
  }

  return (
    <div className="min-h-screen-dvh">
      <PageHeader
        title="Learning"
        subtitle={`${totalHours}h total · ${thisWeekHours}h this week`}
        rightAction={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
            Add
          </Button>
        }
      />

      <div className="px-4 pb-4 flex flex-col gap-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total hours', value: `${totalHours}h` },
            { label: 'This week', value: `${thisWeekHours}h` },
            { label: 'Active items', value: String(items?.length ?? 0) },
          ].map(s => (
            <GlassCard key={s.label} padding="sm" className="text-center">
              <p className="text-lg font-bold text-accent">{s.value}</p>
              <p className="text-[10px] text-content-muted mt-0.5">{s.label}</p>
            </GlassCard>
          ))}
        </div>

        <Tabs
          tabs={[{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }]}
          activeTab={activeTab}
          onChange={id => setActiveTab(id as any)}
        />

        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'book', 'course', 'skill'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-all ${filterType === t ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}
            >
              {t === 'all' ? 'All' : TYPE_CONFIG[t].label + 's'}
            </button>
          ))}
        </div>

        {!filtered.length ? (
          <EmptyState
            icon={<BookOpen size={24} />}
            title={activeTab === 'active' ? 'Nothing in progress' : 'Nothing completed yet'}
            subtitle="Add a book, course, or skill to start tracking your learning"
            action={activeTab === 'active' ? { label: 'Add Item', onClick: () => setIsFormOpen(true) } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(item => {
              const cfg = TYPE_CONFIG[item.type];
              const itemSessions = allSessions?.filter(s => s.learningItemId === item.id) ?? [];
              const totalMins = itemSessions.reduce((s, l) => s + l.durationMinutes, 0);
              return (
                <GlassCard key={item.id} variant="interactive" onClick={() => setSelectedItem(item)}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.coverColor}22` }}
                    >
                      <cfg.icon size={20} style={{ color: item.coverColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-content-primary truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="default" size="xs">{cfg.label}</Badge>
                        {item.author && <span className="text-xs text-content-muted">{item.author}</span>}
                        {item.platform && <span className="text-xs text-content-muted">{item.platform}</span>}
                        <span className="text-xs text-content-muted flex items-center gap-0.5">
                          <Clock size={10} />{formatMinutes(totalMins)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <ProgressBar value={item.progress} color="custom" customColor={item.coverColor} className="flex-1" size="xs" />
                        <span className="text-xs text-content-muted">{item.progress}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <IconButton icon={<Edit3 size={13} />} label={`Edit ${item.title}`} onClick={e => { e.stopPropagation(); setEditingId(item.id!); setIsFormOpen(true); }} />
                      <IconButton icon={<Trash2 size={13} />} label={`Delete ${item.title}`} onClick={e => { e.stopPropagation(); setDeletingId(item.id!); }} variant="danger" />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit form */}
      <BottomSheet
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingId(null); }}
        title={editingId ? 'Edit Item' : 'Add Learning Item'}
        snapPoints
      >
        <LearningForm itemId={editingId} onClose={() => { setIsFormOpen(false); setEditingId(null); }} />
      </BottomSheet>

      {/* Item detail / session logging */}
      <BottomSheet
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        snapPoints
      >
        {selectedItem && (
          <LearningDetail
            item={selectedItem}
            sessions={allSessions?.filter(s => s.learningItemId === selectedItem.id) ?? []}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </BottomSheet>

      {/* Delete confirm */}
      <Modal open={!!deletingId} onClose={() => setDeletingId(null)} title="Delete item?" size="sm">
        <p className="text-sm text-content-secondary mb-4">Sessions and progress will also be deleted.</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={deleteItem}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────
function LearningForm({ itemId, onClose }: { itemId: number | null; onClose: () => void }) {
  const [type, setType] = useState<LearningItemType>('book');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [platform, setPlatform] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [totalLessons, setTotalLessons] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    db.learningItems.get(itemId).then(item => {
      if (!item) return;
      setType(item.type); setTitle(item.title); setAuthor(item.author ?? '');
      setPlatform(item.platform ?? ''); setTotalPages(String(item.totalPages ?? ''));
      setTotalLessons(String(item.totalLessons ?? '')); setTargetDate(item.targetDate ?? '');
      setCoverColor(item.coverColor);
    });
  }, [itemId]);

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const data = {
        type, title: title.trim(),
        author: author.trim() || undefined,
        platform: platform.trim() || undefined,
        totalPages: totalPages ? parseInt(totalPages) : undefined,
        totalLessons: totalLessons ? parseInt(totalLessons) : undefined,
        targetDate: targetDate || undefined,
        coverColor, status: 'active' as LearningStatus,
        progress: 0, updatedAt: now,
      };
      if (itemId) {
        await db.learningItems.update(itemId, data);
        toast.success('Updated!');
      } else {
        await db.learningItems.add({ ...data, createdAt: now });
        toast.success('Added!');
      }
      onClose();
    } catch { toast.error('Failed to save'); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Type selector */}
      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Type</label>
        <div className="flex gap-2">
          {(['book', 'course', 'skill'] as const).map(t => {
            const cfg = TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-input transition-all ${type === t ? 'accent-gradient text-white' : 'glass-1 text-content-muted'}`}
              >
                <cfg.icon size={18} />
                <span className="text-xs font-medium">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'book' ? 'Book title' : type === 'course' ? 'Course name' : 'Skill name'} autoFocus />

      {type === 'book' && (
        <Input label="Author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" />
      )}
      {type === 'course' && (
        <Input label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} placeholder="e.g. Udemy, Coursera" />
      )}

      <div className="grid grid-cols-2 gap-3">
        {type === 'book' && (
          <Input label="Total Pages" type="number" inputMode="numeric" value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="320" />
        )}
        {type === 'course' && (
          <Input label="Total Lessons" type="number" inputMode="numeric" value={totalLessons} onChange={e => setTotalLessons(e.target.value)} placeholder="48" />
        )}
        <Input label="Target Date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium text-content-secondary uppercase tracking-wide mb-2 block">Colour</label>
        <div className="flex gap-2 flex-wrap">
          {COVER_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setCoverColor(c)}
              className="w-8 h-8 rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: c, outline: coverColor === c ? '2px solid white' : 'none', outlineOffset: '2px' }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} loading={loading}>
          {itemId ? 'Update' : 'Add Item'}
        </Button>
      </div>
    </div>
  );
}

// ─── Detail view with session logging ─────────────────────────
function LearningDetail({
  item,
  sessions,
  onClose,
}: {
  item: LearningItem;
  sessions: { id?: number; learningItemId: number; date: string; durationMinutes: number; progressDelta: number; notes?: string; takeaway?: string; createdAt: string }[];
  onClose: () => void;
}) {
  const [isLoggingSession, setIsLoggingSession] = useState(false);
  const [sessionDuration, setSessionDuration] = useState('');
  const [sessionProgress, setSessionProgress] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionTakeaway, setSessionTakeaway] = useState('');
  const [newTakeaway, setNewTakeaway] = useState('');

  const totalMins = sessions.reduce((s, l) => s + l.durationMinutes, 0);
  const cfg = TYPE_CONFIG[item.type];

  const logSession = async () => {
    const mins = parseInt(sessionDuration);
    if (!mins || mins <= 0) { toast.error('Enter session duration'); return; }
    const delta = parseFloat(sessionProgress) || 0;
    const newProgress = Math.min(100, item.progress + delta);
    const now = new Date().toISOString();
    try {
      await db.learningSessions.add({
        learningItemId: item.id!,
        date: todayStr(),
        durationMinutes: mins,
        progressDelta: delta,
        notes: sessionNotes.trim() || undefined,
        takeaway: sessionTakeaway.trim() || undefined,
        createdAt: now,
      });
      const updates: Partial<LearningItem> = { progress: newProgress, updatedAt: now };
      if (item.type === 'book' && item.totalPages) {
        updates.currentPage = Math.round((newProgress / 100) * item.totalPages);
      }
      if (item.type === 'course' && item.totalLessons) {
        updates.completedLessons = Math.round((newProgress / 100) * item.totalLessons);
      }
      if (newProgress >= 100) updates.status = 'completed';
      await db.learningItems.update(item.id!, updates);
      if (newProgress >= 100) toast.success('Item completed! 🎓');
      else toast.success('Session logged!');
      setSessionDuration(''); setSessionProgress(''); setSessionNotes(''); setSessionTakeaway('');
      setIsLoggingSession(false);
      if (newProgress >= 100) onClose();
    } catch { toast.error('Failed to log session'); }
  };

  const addTakeaway = async () => {
    if (!newTakeaway.trim()) return;
    const existing = item.takeaways ?? [];
    await db.learningItems.update(item.id!, {
      takeaways: [...existing, newTakeaway.trim()],
      updatedAt: new Date().toISOString(),
    });
    setNewTakeaway('');
    toast.success('Takeaway saved!');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${item.coverColor}22` }}
        >
          <cfg.icon size={28} style={{ color: item.coverColor }} />
        </div>
        <div className="flex-1">
          {item.author && <p className="text-xs text-content-muted">{item.author}</p>}
          {item.platform && <p className="text-xs text-content-muted">{item.platform}</p>}
          <div className="flex items-center gap-2 mt-1">
            <Clock size={12} className="text-content-muted" />
            <span className="text-xs text-content-secondary">{formatMinutes(totalMins)} total</span>
            {item.targetDate && (
              <span className="text-xs text-content-muted">· Due {formatDate(item.targetDate)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-content-muted">Progress</span>
          <span className="text-xs font-semibold" style={{ color: item.coverColor }}>{item.progress}%</span>
        </div>
        <ProgressBar value={item.progress} color="custom" customColor={item.coverColor} size="md" />
        {item.type === 'book' && item.totalPages && (
          <p className="text-xs text-content-muted mt-1">{item.currentPage ?? 0} / {item.totalPages} pages</p>
        )}
        {item.type === 'course' && item.totalLessons && (
          <p className="text-xs text-content-muted mt-1">{item.completedLessons ?? 0} / {item.totalLessons} lessons</p>
        )}
      </div>

      {/* Log session button */}
      <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setIsLoggingSession(true)}>
        Log Session
      </Button>

      {/* Session history */}
      {sessions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Recent Sessions</p>
          <div className="flex flex-col gap-2">
            {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-3 glass-1 rounded-input px-3 py-2.5">
                <div>
                  <p className="text-sm text-content-primary">{formatMinutes(s.durationMinutes)}</p>
                  <p className="text-xs text-content-muted">{formatDate(s.date)}</p>
                </div>
                {s.progressDelta > 0 && (
                  <Badge variant="success" size="xs" className="ml-auto">+{s.progressDelta}%</Badge>
                )}
                {s.takeaway && (
                  <p className="text-xs text-content-muted italic truncate ml-2 flex-1">"{s.takeaway}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key takeaways */}
      {((item.takeaways ?? []).length > 0 || true) && (
        <div>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Key Takeaways</p>
          {(item.takeaways ?? []).map((t, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
              <span className="text-accent text-xs mt-0.5">•</span>
              <p className="text-sm text-content-secondary">{t}</p>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Input
              value={newTakeaway}
              onChange={e => setNewTakeaway(e.target.value)}
              placeholder="Add a key takeaway…"
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addTakeaway()}
            />
            <Button variant="primary" size="sm" onClick={addTakeaway} disabled={!newTakeaway.trim()}>Add</Button>
          </div>
        </div>
      )}

      {/* Log session bottom sheet */}
      <BottomSheet open={isLoggingSession} onClose={() => setIsLoggingSession(false)} title="Log Session">
        <div className="flex flex-col gap-4">
          <Input
            label="Duration (minutes) *"
            type="number"
            inputMode="numeric"
            value={sessionDuration}
            onChange={e => setSessionDuration(e.target.value)}
            placeholder="e.g. 45"
            autoFocus
          />
          <Input
            label="Progress added (%)"
            type="number"
            inputMode="decimal"
            value={sessionProgress}
            onChange={e => setSessionProgress(e.target.value)}
            placeholder={`Current: ${item.progress}%`}
            helper="How much did you complete? (e.g. 5 for +5%)"
          />
          <Textarea
            label="Session notes"
            value={sessionNotes}
            onChange={e => setSessionNotes(e.target.value)}
            placeholder="What did you cover?"
            rows={2}
          />
          <Input
            label="Key takeaway"
            value={sessionTakeaway}
            onChange={e => setSessionTakeaway(e.target.value)}
            placeholder="One thing you learned…"
          />
          <Button variant="primary" onClick={logSession} disabled={!sessionDuration}>Log Session</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
