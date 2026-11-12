import React from 'react';
import { cn } from '../../utils/cn';

interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
  size?: 'sm' | 'md';
  scrollable?: boolean;
}

export function Tabs({ tabs, activeTab, onChange, className, variant = 'pill', size = 'md', scrollable = false }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex border-b border-white/[0.06]', scrollable && 'overflow-x-auto scroll-smooth-snap', className)}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200',
              'border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-accent border-accent'
                : 'text-content-muted border-transparent hover:text-content-secondary',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                activeTab === tab.id ? 'bg-accent/20 text-violet-300' : 'bg-white/10 text-content-muted',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex p-1 glass-1 rounded-pill gap-1', scrollable && 'overflow-x-auto scroll-smooth-snap', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap transition-all duration-200',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            activeTab === tab.id
              ? 'accent-gradient text-white shadow-accent-sm'
              : 'text-content-muted hover:text-content-secondary',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              activeTab === tab.id ? 'bg-white/20' : 'bg-white/10',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
