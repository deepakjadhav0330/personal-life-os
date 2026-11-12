import { cn } from '../../utils/cn';

interface ProgressRingProps {
  value: number;     // 0–100
  size?: number;     // px diameter
  strokeWidth?: number;
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'custom';
  customColor?: string;
  showLabel?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
}

const colorMap = {
  accent: 'url(#accentGradient)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  custom: '',
};

export function ProgressRing({
  value, size = 80, strokeWidth = 6,
  color = 'accent', customColor, showLabel = true, label, sublabel, className,
}: ProgressRingProps) {
  const pct = Math.min(Math.max(value, 0), 100);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const id = `ring-${color}-${size}`;
  const gradId = `grad-${id}`;

  const stroke = color === 'custom' ? (customColor || '#7c3aed') : colorMap[color];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {color === 'accent' && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        )}
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color === 'accent' ? `url(#${gradId})` : stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          {label !== undefined ? (
            <span className="text-sm font-bold text-content-primary">{label}</span>
          ) : (
            <span className="text-sm font-bold text-content-primary">{Math.round(pct)}%</span>
          )}
          {sublabel && <span className="text-[10px] text-content-muted mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
