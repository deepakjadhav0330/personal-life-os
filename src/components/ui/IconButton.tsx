import React from 'react';
import { cn } from '../../utils/cn';

interface IconButtonProps {
  icon: React.ReactNode;
  /** Required — becomes the aria-label for screen readers */
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  /** sm = 36px (dense list rows), md = 44px (default, full touch target) */
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const sizeClasses = {
  sm: 'w-9 h-9',    // 36px — acceptable for dense list rows
  md: 'w-11 h-11',  // 44px — WCAG / Apple HIG minimum
};

const variantClasses = {
  default: 'glass-1 text-content-muted hover:text-content-primary active:scale-95',
  danger:  'glass-1 text-content-muted hover:text-danger hover:bg-danger/10 active:scale-95',
  warning: 'glass-1 text-content-muted hover:text-warning hover:bg-warning/10 active:scale-95',
  success: 'glass-1 text-content-muted hover:text-success hover:bg-success/10 active:scale-95',
};

export function IconButton({
  icon, label, onClick, variant = 'default', size = 'sm',
  disabled, className, type = 'button',
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center rounded-input transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed shrink-0',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      {icon}
    </button>
  );
}
