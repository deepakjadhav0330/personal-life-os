import React from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses = {
  primary: 'accent-gradient text-white font-semibold hover:opacity-92 active:opacity-80 active:scale-[0.98]',
  secondary: 'glass-2 text-content-primary hover:bg-white/[0.13] active:bg-white/[0.08]',
  ghost: 'bg-transparent text-content-secondary hover:text-content-primary hover:bg-white/[0.06] active:bg-white/[0.04]',
  danger: 'bg-danger/15 text-red-300 border border-danger/30 hover:bg-danger/25 active:bg-danger/20',
  success: 'bg-success/15 text-green-300 border border-success/30 hover:bg-success/25',
};

const sizeClasses = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-input gap-2',
  lg: 'h-12 px-6 text-base rounded-input gap-2',
  icon: 'h-10 w-10 rounded-input p-0',
};

export function Button({
  children, variant = 'secondary', size = 'md', fullWidth = false,
  loading = false, disabled, leftIcon, rightIcon, className, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'min-h-touch min-w-touch',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {size !== 'icon' && children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
