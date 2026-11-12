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
  default: 'glass-1',
  elevated: 'glass-elevated',
  interactive: 'glass-1 cursor-pointer active:scale-[0.98] hover:border-white/15 transition-all duration-200',
  accent: 'glass-1 border-accent/30 border-t-accent/50',
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
        'rounded-card shadow-glass',
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
