import { TrendingUp, AlertTriangle, AlertCircle, Brain } from 'lucide-react';
import { GlassCard } from '../../../components/ui';
import type { OverallStatus } from '../insightEngine/insightTypes';

interface OverallStatusBannerProps {
  status: OverallStatus;
}

export function OverallStatusBanner({ status }: OverallStatusBannerProps) {
  const { summary, positiveCount, attentionCount, criticalCount } = status;
  const totalInsights = positiveCount + attentionCount + criticalCount;

  const bannerVariant: 'default' | 'accent' =
    criticalCount === 0 && attentionCount === 0 && positiveCount > 0
      ? 'accent'
      : 'default';

  return (
    <GlassCard variant={bannerVariant}>
      {/* Icon + summary */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 accent-gradient">
          <Brain size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-1">
            Life OS Intelligence
          </p>
          <p className="text-sm font-medium text-content-primary leading-snug">
            {summary || 'Analysing your data…'}
          </p>
        </div>
      </div>

      {/* Counts row */}
      {totalInsights > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
          {positiveCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-green-400">
              <TrendingUp size={11} />
              {positiveCount} positive
            </span>
          )}
          {attentionCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle size={11} />
              {attentionCount} attention
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertCircle size={11} />
              {criticalCount} critical
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}
