import { useMemo } from 'react';
import { cn } from '../../utils/cn';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'custom';
  customColor?: string;
  showLabel?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
}

const colorMap = {
  accent: 'url(#__grad__)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  custom: '',
};

let _ringCounter = 0;

export function ProgressRing({
  value, size = 80, strokeWidth = 6,
  color = 'accent', customColor, showLabel = true, label, sublabel, className,
}: ProgressRingProps) {
  // Unique stable ID per component instance — prevents SVG gradient collisions
  // when multiple rings with the same color and size appear on the same page.
  const uid = useMemo(() => `ring-${++_ringCounter}`, []);

  const pct = Math.min(Math.max(value, 0), 100);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const stroke = color === 'custom' ? (customColor || '#7c3aed') : colorMap[color].replace('__grad__', uid);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {color === 'accent' && (
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b47ff" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color === 'accent' ? `url(#${uid})` : stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label !== undefined
            ? <span className="text-sm font-bold text-content-primary">{label}</span>
            : <span className="text-sm font-bold text-content-primary">{Math.round(pct)}%</span>
          }
          {sublabel && <span className="text-[10px] text-content-muted mt-0.5">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
