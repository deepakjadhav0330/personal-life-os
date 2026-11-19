import { useState } from 'react';
import {
  DollarSign, Dumbbell, Flame, Target, CheckSquare,
  GraduationCap, Activity, ChevronDown, ChevronRight,
} from 'lucide-react';
import { GlassCard } from '../../../components/ui';
import { InsightCard } from './InsightCard';
import type { InsightGroup as InsightGroupType, InsightCategory } from '../insightEngine/insightTypes';

interface InsightGroupProps {
  group: InsightGroupType;
  onDismiss: (id: string, dataHash: string) => void;
}

const CATEGORY_ICON: Record<InsightCategory, React.ReactNode> = {
  finance:        <DollarSign   size={15} />,
  fitness:        <Dumbbell     size={15} />,
  habits:         <Flame        size={15} />,
  goals:          <Target       size={15} />,
  tasks:          <CheckSquare  size={15} />,
  learning:       <GraduationCap size={15} />,
  daily_activity: <Activity     size={15} />,
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

export function InsightGroup({ group, onDismiss }: InsightGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = CATEGORY_COLOR[group.category];
  const icon  = CATEGORY_ICON[group.category];

  return (
    <section>
      {/* Category header — tappable to collapse */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between mb-2 group"
        aria-expanded={!collapsed}
        aria-label={`${group.label} insights, ${group.insights.length} items`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1e`, border: `1px solid ${color}44`, color }}
          >
            {icon}
          </span>
          <span className="text-sm font-semibold text-content-primary">{group.label}</span>
          {group.hasData && group.insights.length > 0 && (
            <span className="glass-1 text-[10px] text-content-muted px-1.5 py-0.5 rounded-full">
              {group.insights.length}
            </span>
          )}
        </div>
        <span className="text-content-muted group-hover:text-content-secondary transition-colors">
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2.5 ml-0">
          {!group.hasData ? (
            /* Category has no data source (e.g. daily_activity) */
            <GlassCard padding="sm">
              <p className="text-xs text-content-muted text-center py-2">
                {group.category === 'daily_activity'
                  ? 'Step and daily activity tracking is not yet available in this version.'
                  : 'No data available for this category.'}
              </p>
            </GlassCard>
          ) : group.insights.length === 0 ? (
            /* Category has data but all insights are dismissed / none triggered */
            <GlassCard padding="sm">
              <div className="flex items-center gap-2 justify-center py-2">
                <span className="text-[11px] text-content-muted">
                  ✓ All caught up here
                </span>
              </div>
            </GlassCard>
          ) : (
            group.insights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
