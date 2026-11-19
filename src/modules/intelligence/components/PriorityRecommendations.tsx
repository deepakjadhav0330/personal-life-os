import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Dumbbell, Flame, Target, CheckSquare,
  GraduationCap, Activity, Zap,
} from 'lucide-react';
import { GlassCard } from '../../../components/ui';
import type { Insight, InsightCategory } from '../insightEngine/insightTypes';

interface PriorityRecommendationsProps {
  insights: Insight[];
}

const CATEGORY_ICON: Record<InsightCategory, React.ReactNode> = {
  finance:        <DollarSign   size={13} />,
  fitness:        <Dumbbell     size={13} />,
  habits:         <Flame        size={13} />,
  goals:          <Target       size={13} />,
  tasks:          <CheckSquare  size={13} />,
  learning:       <GraduationCap size={13} />,
  daily_activity: <Activity     size={13} />,
};

const CATEGORY_COLOR: Record<InsightCategory, string> = {
  finance:        '#22c55e',
  fitness:        '#ef4444',
  habits:         '#f59e0b',
  goals:          '#8b5cf6',
  tasks:          '#3b82f6',
  learning:       '#06b6d4',
  daily_activity: '#94a3b8',
};

const SEVERITY_DOT: Record<string, string> = {
  critical:  '#ef4444',
  attention: '#f59e0b',
  positive:  '#22c55e',
};

export function PriorityRecommendations({ insights }: PriorityRecommendationsProps) {
  const navigate = useNavigate();

  if (!insights.length) return null;

  return (
    <GlassCard padding="none">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="w-6 h-6 rounded-lg accent-gradient flex items-center justify-center">
          <Zap size={12} className="text-white" />
        </div>
        <p className="text-xs font-semibold text-content-primary uppercase tracking-widest">
          Focus now
        </p>
      </div>

      {/* Insight rows */}
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {insights.map(insight => {
          const color = CATEGORY_COLOR[insight.category];
          const icon  = CATEGORY_ICON[insight.category];
          const dot   = SEVERITY_DOT[insight.severity];

          return (
            <button
              key={insight.id}
              onClick={() => insight.actionPath && navigate(insight.actionPath)}
              disabled={!insight.actionPath}
              className="flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors active:bg-white/[0.06] disabled:cursor-default"
              aria-label={`${insight.title} — navigate to ${insight.actionPath}`}
            >
              {/* Category icon */}
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}1e`, color }}
              >
                {icon}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-content-primary leading-snug truncate">
                  {insight.title}
                </p>
                {insight.supportingMetric && (
                  <p className="text-[11px] text-content-muted mt-0.5">
                    {insight.supportingMetric}
                  </p>
                )}
              </div>

              {/* Severity dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                style={{ backgroundColor: dot }}
              />
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
