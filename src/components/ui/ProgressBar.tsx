import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;      // 0–100
  max?: number;
  className?: string;
  trackClassName?: string;
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'custom';
  customColor?: string;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  animated?: boolean;
}

const colorMap = {
  accent: 'accent-gradient',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  custom: '',
};

const heightMap = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

export function ProgressBar({
  value, max = 100, className, trackClassName, color = 'accent',
  customColor, showLabel = false, size = 'sm', animated = false,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-white/[0.06] overflow-hidden', heightMap[size], trackClassName)}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            color !== 'custom' ? colorMap[color] : '',
            animated && 'animate-pulse-slow',
          )}
          style={{
            width: `${pct}%`,
            ...(color === 'custom' && customColor ? { background: customColor } : {}),
          }}
        />
      </div>
      {showLabel && <span className="text-xs text-content-muted w-9 text-right">{Math.round(pct)}%</span>}
    </div>
  );
}
