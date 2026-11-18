import { useState } from 'react';
import { Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '../ui';
import { db } from '../../db/database';
import { toast } from '../../stores/useToastStore';

const SEEN_KEY = 'lifeOS_seen_welcome_banner';

export function useShouldShowBanner(): boolean {
  // Show if the user has never dismissed it
  return !localStorage.getItem(SEEN_KEY);
}

export function SampleDataBanner() {
  const [visible, setVisible] = useState(true);
  const [clearing, setClearing] = useState(false);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(SEEN_KEY, 'true');
    setVisible(false);
  }

  async function clearAndStart() {
    setClearing(true);
    try {
      // Same logic as Settings → Danger Zone clear
      await db.delete();
      await db.open();
      const now = new Date().toISOString();
      await db.settings.add({ key: 'skipSeed', value: JSON.stringify(true), updatedAt: now });
      localStorage.setItem('lifeOS_userCleared', 'true');
      localStorage.setItem(SEEN_KEY, 'true');
      toast.success("All clear — you're starting fresh!");
      window.location.reload();
    } catch {
      toast.error('Could not clear data — please try again');
      setClearing(false);
    }
  }

  return (
    <div className="relative glass-1 rounded-card border border-accent/25 px-4 py-4 overflow-hidden">
      {/* Subtle accent glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-card"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, transparent 60%)' }}
      />

      {/* Dismiss X */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 text-content-muted hover:text-content-primary transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3 pr-5">
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-content-primary">
              Welcome to Life OS! 👋
            </p>
            <p className="text-xs text-content-muted mt-0.5 leading-relaxed">
              You're looking at <strong className="text-content-secondary">sample data</strong> — it's here
              so you can explore the app before adding anything real. When you're ready, clear it and
              start fresh.
            </p>
          </div>
        </div>

        {/* What the sample data covers */}
        <div className="flex flex-wrap gap-1.5 pl-12">
          {['Tasks', 'Habits', 'Workouts', 'Finances', 'Journal', 'Goals'].map(label => (
            <span
              key={label}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.07] text-content-muted"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pl-12">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Trash2 size={12} />}
            loading={clearing}
            onClick={clearAndStart}
          >
            Clear &amp; start fresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            disabled={clearing}
          >
            Explore first
          </Button>
        </div>
      </div>
    </div>
  );
}
