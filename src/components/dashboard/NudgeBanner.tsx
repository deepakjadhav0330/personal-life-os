import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Nudge } from '../../hooks/useSmartNudges';
import { getDismissed, persistDismiss } from '../../hooks/useSmartNudges';

interface NudgeBannerProps {
  nudges: Nudge[];
}

export function NudgeBanner({ nudges }: NudgeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  // Filter out dismissed nudges and sort by priority
  const active = nudges
    .filter(n => !dismissed.has(n.id))
    .sort((a, b) => a.priority - b.priority);

  if (!active.length) return null;

  const nudge   = active[0];
  const moreCount = active.length - 1;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    persistDismiss(nudge.id);
    setDismissed(getDismissed());
  };

  const handleAction = () => {
    if (nudge.action) navigate(nudge.action.path);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card px-3 py-3 glass-1 animate-fade-in',
        'border-l-[3px] transition-all duration-200',
      )}
      style={{ borderLeftColor: nudge.color }}
    >
      {/* Emoji */}
      <span className="text-base shrink-0 select-none">{nudge.emoji}</span>

      {/* Message */}
      <p className="flex-1 text-xs text-content-secondary leading-snug min-w-0">
        {nudge.message}
      </p>

      {/* More count badge */}
      {moreCount > 0 && (
        <span className="text-[10px] text-content-muted font-medium shrink-0 glass-1 px-1.5 py-0.5 rounded-full">
          +{moreCount}
        </span>
      )}

      {/* Action button */}
      {nudge.action && (
        <button
          onClick={handleAction}
          className="flex items-center gap-0.5 text-[11px] font-semibold shrink-0 transition-opacity hover:opacity-70"
          style={{ color: nudge.color }}
        >
          {nudge.action.label}
          <ChevronRight size={11} />
        </button>
      )}

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.06] transition-all"
      >
        <X size={12} />
      </button>
    </div>
  );
}
