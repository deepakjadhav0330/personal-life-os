import {
  DollarSign, Dumbbell, Flame, Target, CheckSquare, GraduationCap,
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import type { ChatGPTCategory } from '../../insightEngine/chatgpt/summaryBuilder';
import type { InsightGroup } from '../../insightEngine/insightTypes';

interface CategorySelectorProps {
  selected: Set<ChatGPTCategory>;
  onChange: (updated: Set<ChatGPTCategory>) => void;
  groups: InsightGroup[];
}

const ALL_CATEGORIES: { id: ChatGPTCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'finance',  label: 'Finance',  icon: <DollarSign    size={16} />, color: '#22c55e' },
  { id: 'fitness',  label: 'Fitness',  icon: <Dumbbell      size={16} />, color: '#ef4444' },
  { id: 'habits',   label: 'Habits',   icon: <Flame         size={16} />, color: '#f59e0b' },
  { id: 'goals',    label: 'Goals',    icon: <Target        size={16} />, color: '#8b5cf6' },
  { id: 'tasks',    label: 'Tasks',    icon: <CheckSquare   size={16} />, color: '#3b82f6' },
  { id: 'learning', label: 'Learning', icon: <GraduationCap size={16} />, color: '#06b6d4' },
];

export function CategorySelector({ selected, onChange, groups }: CategorySelectorProps) {
  function toggle(id: ChatGPTCategory) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(ALL_CATEGORIES.map(c => c.id)));
  }

  function clearAll() {
    onChange(new Set());
  }

  // Get insight count per category from groups (for context hint)
  const insightCount = Object.fromEntries(
    groups.map(g => [g.category, g.insights.length]),
  );

  return (
    <div>
      {/* Select all / clear controls */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-content-muted">
          Select the categories to include in your summary.
        </p>
        <div className="flex gap-2">
          <button onClick={selectAll} className="text-[11px] text-accent hover:underline">
            All
          </button>
          <span className="text-content-muted text-[11px]">·</span>
          <button onClick={clearAll} className="text-[11px] text-content-muted hover:text-content-secondary hover:underline">
            None
          </button>
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2">
        {ALL_CATEGORIES.map(cat => {
          const isSelected = selected.has(cat.id);
          const count = insightCount[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-card text-left transition-all duration-200',
                isSelected
                  ? 'glass-2 border border-white/[0.12]'
                  : 'glass-1 border border-white/[0.04] opacity-70',
              )}
              aria-pressed={isSelected}
            >
              {/* Checkbox indicator */}
              <span className={cn(
                'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all',
                isSelected
                  ? 'accent-gradient text-white'
                  : 'border border-white/20 text-transparent',
              )}>
                ✓
              </span>

              {/* Icon */}
              <span style={{ color: cat.color }}>{cat.icon}</span>

              {/* Label + count */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-content-primary">{cat.label}</p>
                {count > 0 && (
                  <p className="text-[10px] text-content-muted">
                    {count} insight{count > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
