import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'priority-high' | 'priority-medium' | 'priority-low' |
    'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'xs' | 'sm';
  dot?: boolean;
  dotColor?: string;
  className?: string;
}

const variantClasses = {
  default: 'bg-white/10 text-content-secondary',
  'priority-high': 'bg-danger/15 text-red-300',
  'priority-medium': 'bg-warning/15 text-amber-300',
  'priority-low': 'bg-info/15 text-blue-300',
  success: 'bg-success/15 text-green-300',
  warning: 'bg-warning/15 text-amber-300',
  danger: 'bg-danger/15 text-red-300',
  info: 'bg-info/15 text-blue-300',
  accent: 'bg-accent/15 text-violet-300',
};

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded-full',
  sm: 'text-xs px-2 py-0.5 rounded-full',
};

export function Badge({ children, variant = 'default', size = 'sm', dot, dotColor, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', variantClasses[variant], sizeClasses[size], className)}>
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dotColor || 'currentColor' }}
        />
      )}
      {children}
    </span>
  );
}
