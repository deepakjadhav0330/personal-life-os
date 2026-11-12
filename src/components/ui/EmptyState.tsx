import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, subtitle, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 gap-2' : 'py-16 gap-4',
      className,
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] text-content-muted',
        compact ? 'w-12 h-12' : 'w-16 h-16',
      )}>
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className={cn('font-semibold text-content-secondary', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {subtitle && <p className="text-sm text-content-muted">{subtitle}</p>}
      </div>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
