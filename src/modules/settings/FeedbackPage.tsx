import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Textarea } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { toast } from '../../stores/useToastStore';
import { cn } from '../../utils/cn';

type Category = 'bug' | 'suggestion' | 'general' | 'praise';

const CATEGORIES: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'bug',        label: 'Bug report',  emoji: '🐛', color: '#ef4444' },
  { id: 'suggestion', label: 'Suggestion',  emoji: '💡', color: '#f59e0b' },
  { id: 'general',    label: 'General',     emoji: '💬', color: '#6366f1' },
  { id: 'praise',     label: 'Praise',      emoji: '⭐', color: '#22c55e' },
];

export function FeedbackPage() {
  const navigate     = useNavigate();
  const [category, setCategory] = useState<Category>('general');
  const [rating,   setRating]   = useState<number | null>(null);
  const [message,  setMessage]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error('Please write at least a few words');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('submit-feedback', {
        body: { category, rating, message: message.trim() },
      });

      if (error) {
        toast.error('Could not send feedback — please try again');
        return;
      }

      setSent(true);
    } catch {
      toast.error('Could not send feedback — check your connection');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen-dvh">
        <PageHeader title="Feedback" back />
        <div className="flex flex-col items-center justify-center px-6 py-20 gap-6 text-center">
          <div className="text-5xl">🙏</div>
          <div>
            <p className="text-lg font-bold text-content-primary">Thanks for your feedback!</p>
            <p className="text-sm text-content-muted mt-1 leading-relaxed">
              It's been sent to the administrator. Every response helps improve Life OS.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Send Feedback" back />
      <div className="px-4 pb-4 flex flex-col gap-4">

        {/* Category */}
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
            What kind of feedback?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-input transition-all duration-200 text-left',
                  category === cat.id
                    ? 'accent-gradient text-white shadow-accent-sm'
                    : 'glass-1 text-content-secondary hover:glass-2',
                )}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Rating — only for general/praise */}
        {(category === 'general' || category === 'praise') && (
          <GlassCard>
            <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
              Overall rating (optional)
            </p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={cn(
                    'text-2xl transition-all duration-150 hover:scale-110 active:scale-95',
                    rating !== null && star <= rating ? 'opacity-100' : 'opacity-30',
                  )}
                >
                  ⭐
                </button>
              ))}
            </div>
            {rating !== null && (
              <p className="text-xs text-content-muted text-center mt-1.5">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
              </p>
            )}
          </GlassCard>
        )}

        {/* Message */}
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">
            Your message
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Textarea
              placeholder={
                category === 'bug'
                  ? 'Describe what happened, what you expected, and how to reproduce it…'
                  : category === 'suggestion'
                  ? 'What feature or improvement would make Life OS better for you?'
                  : category === 'praise'
                  ? 'What do you love about Life OS?'
                  : 'Share your thoughts, questions or anything on your mind…'
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-content-dim">
                {message.length}/2000
              </span>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={message.trim().length < 5}
              >
                Send Feedback
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Privacy note */}
        <p className="text-[11px] text-content-dim text-center px-2">
          Your name and email are included with your feedback so the administrator can follow up if needed.
        </p>
      </div>
    </div>
  );
}
