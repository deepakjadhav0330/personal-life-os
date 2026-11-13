import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'interactive' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  as?: React.ElementType;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const variantClasses = {
  default:     'glass-1',
  elevated:    'glass-elevated',
  interactive: 'glass-1 cursor-pointer active:scale-[0.985] hover:glass-2 transition-all duration-200',
  accent:      'glass-1 !border-accent/35 !border-t-accent/55 shadow-[0_4px_20px_rgba(124,58,237,0.18)]',
};

export function GlassCard({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
  as: Tag = 'div',
}: GlassCardProps) {
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'relative rounded-card overflow-hidden',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
    >
      {/* Subtle directional-light overlay — simulates glass catching light
          from the top-left, fades toward bottom-right.               */}
      <div
        className="pointer-events-none absolute inset-0 rounded-card"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.045) 0%, transparent 55%)',
        }}
      />
      {/* Content sits above the overlay */}
      <div className={cn('relative', padding === 'none' ? '' : 'z-10')}>
        {children}
      </div>
    </Tag>
  );
}
