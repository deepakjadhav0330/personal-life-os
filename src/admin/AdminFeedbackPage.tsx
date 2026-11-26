import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { GlassCard, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { markFeedbackSeen } from '../hooks/useAdminNudges';

type Category = 'bug' | 'suggestion' | 'general' | 'praise';

interface FeedbackItem {
  id: string;
  user_name: string | null;
  user_email: string | null;
  category: Category;
  rating: number | null;
  message: string;
  created_at: string;
}

const CATEGORY_CONFIG: Record<Category, { emoji: string; color: string; label: string }> = {
  bug:        { emoji: '🐛', color: 'bg-danger/20 text-danger',   label: 'Bug' },
  suggestion: { emoji: '💡', color: 'bg-warning/20 text-warning', label: 'Suggestion' },
  general:    { emoji: '💬', color: 'bg-accent/20 text-accent',   label: 'General' },
  praise:     { emoji: '⭐', color: 'bg-success/20 text-success', label: 'Praise' },
};

type Filter = 'all' | Category;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bug', label: '🐛 Bugs' },
  { id: 'suggestion', label: '💡 Suggestions' },
  { id: 'general', label: '💬 General' },
  { id: 'praise', label: '⭐ Praise' },
];

export function AdminFeedbackPage() {
  const { session }   = useAuth();
  const [items, setItems]     = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>('all');
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [error, setError]     = useState('');

  const fetchFeedback = useCallback(async (pg = 1, cat: Filter = 'all') => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({ page: String(pg) });
      if (cat !== 'all') params.set('category', cat);
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-feedback?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as { feedback: FeedbackItem[]; total: number; pages: number };
      setItems(data.feedback);
      setTotal(data.total);
      setPages(data.pages);
      // Mark all current feedback as seen so the admin notification clears
      markFeedbackSeen(data.total);
      setPage(pg);
      setError('');
    } catch {
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { fetchFeedback(1, filter); }, [fetchFeedback, filter]);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-content-primary">Feedback</h2>
          <p className="text-xs text-content-muted">{total} response{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => fetchFeedback(page, filter)}
          className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all shrink-0',
              filter === f.id ? 'accent-gradient text-white' : 'glass-1 text-content-muted hover:text-content-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <GlassCard className="border-danger/30"><p className="text-sm text-danger">{error}</p></GlassCard>}

      {/* Feedback list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <GlassCard key={i}>
              <div className="h-4 w-24 bg-white/[0.07] rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-white/[0.05] rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-white/[0.05] rounded animate-pulse mt-1" />
            </GlassCard>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No feedback yet"
          subtitle={filter === 'all' ? 'Feedback from users will appear here' : `No ${filter} feedback yet`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.general;
            return (
              <GlassCard key={item.id}>
                {/* Meta row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.color)}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    {item.rating && (
                      <span className="text-[10px] text-warning">
                        {'⭐'.repeat(item.rating)} {item.rating}/5
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-content-dim shrink-0">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Message */}
                <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>

                {/* User */}
                <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full accent-gradient flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-white">
                      {(item.user_name ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-content-muted">
                    {item.user_name ?? 'Unknown'} · {item.user_email ?? ''}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchFeedback(page - 1, filter)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs glass-1 rounded-lg text-content-muted hover:text-content-primary disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-content-muted">{page} / {pages}</span>
          <button
            onClick={() => fetchFeedback(page + 1, filter)}
            disabled={page >= pages}
            className="px-3 py-1.5 text-xs glass-1 rounded-lg text-content-muted hover:text-content-primary disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
