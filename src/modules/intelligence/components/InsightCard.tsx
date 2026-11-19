import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, TrendingUp, AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard, Button, Badge } from '../../../components/ui';
import type { Insight } from '../insightEngine/insightTypes';

interface InsightCardProps {
  insight: Insight;
  onDismiss: (id: string, dataHash: string) => void;
}

const SEVERITY_CONFIG = {
  positive: {
    borderColor: '#22c55e',
    badgeVariant: 'success' as const,
    icon:         <TrendingUp  size={12} />,
    label:        'On track',
  },
  attention: {
    borderColor: '#f59e0b',
    badgeVariant: 'warning' as const,
    icon:         <AlertTriangle size={12} />,
    label:        'Attention',
  },
  critical: {
    borderColor: '#ef4444',
    badgeVariant: 'danger' as const,
    icon:         <AlertCircle size={12} />,
    label:        'Action needed',
  },
} as const;

export function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[insight.severity];

  const explanationLong = insight.explanation.length > 120;
  const displayText     = !explanationLong || expanded
    ? insight.explanation
    : insight.explanation.slice(0, 118) + '…';

  return (
    <div className="relative">
      {/* Severity left-border accent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ backgroundColor: cfg.borderColor }}
      />

      <GlassCard className="pl-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant={cfg.badgeVariant} size="xs" dot dotColor={cfg.borderColor}>
            {cfg.icon}
            <span className="ml-0.5">{cfg.label}</span>
          </Badge>

          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(insight.id, insight.dataHash)}
            aria-label="Dismiss this insight"
            className="flex-shrink-0 p-1 -mr-1 -mt-0.5 rounded-full text-content-muted hover:text-content-secondary hover:bg-white/[0.06] transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-content-primary mb-1 leading-snug">
          {insight.title}
        </p>

        {/* Explanation */}
        <p className="text-xs text-content-secondary leading-relaxed">
          {displayText}
        </p>

        {explanationLong && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-0.5 text-[11px] text-content-muted hover:text-content-secondary flex items-center gap-0.5 transition-colors"
          >
            {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show more</>}
          </button>
        )}

        {/* Supporting metric + comparison period */}
        {(insight.supportingMetric || insight.comparisonPeriod) && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {insight.supportingMetric && (
              <span className="glass-1 text-[11px] text-content-secondary px-2 py-0.5 rounded-full font-medium">
                {insight.supportingMetric}
              </span>
            )}
            {insight.comparisonPeriod && (
              <span className="text-[11px] text-content-muted">
                {insight.comparisonPeriod}
              </span>
            )}
          </div>
        )}

        {/* Recommended action */}
        {insight.recommendedAction && (
          <p className="mt-2 text-[11px] text-content-muted italic leading-relaxed">
            {insight.recommendedAction}
          </p>
        )}

        {/* Action button */}
        {insight.actionPath && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(insight.actionPath!)}
              className="text-[11px] h-7 px-2"
            >
              View {insight.category.replace('_', ' ')} →
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
