import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

export function Toggle({ checked, onChange, size = 'md', disabled, label, description, className }: ToggleProps) {
  if (label || description) {
    return (
      <div className={cn('flex items-center justify-between gap-3', className)}>
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-content-primary">{label}</span>}
          {description && <span className="text-xs text-content-muted">{description}</span>}
        </div>
        <ToggleButton checked={checked} onChange={onChange} disabled={disabled} size={size} />
      </div>
    );
  }

  return (
    <ToggleButton checked={checked} onChange={onChange} disabled={disabled}
      size={size} className={className} />
  );
}

function ToggleButton({
  checked, onChange, disabled, size = 'md', className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  // Track and thumb sizes in px — explicit values avoid translateX + translateY
  // stacking bugs on iOS Safari WebKit
  const track = size === 'sm' ? { w: 36, h: 20 } : { w: 44, h: 24 };
  const thumb = size === 'sm' ? { w: 14, h: 14 } : { w: 16, h: 16 };
  const pad   = size === 'sm' ? 3 : 4; // gap from edge

  const thumbLeft  = checked ? track.w - thumb.w - pad : pad;
  const thumbTop   = (track.h - thumb.h) / 2;

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{ width: track.w, height: track.h }}
      className={cn(
        'relative shrink-0 rounded-full transition-colors duration-200',
        checked ? 'accent-gradient' : 'bg-white/[0.12]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className="absolute rounded-full bg-white shadow transition-all duration-200"
        style={{
          width:  thumb.w,
          height: thumb.h,
          left:   thumbLeft,
          top:    thumbTop,
        }}
      />
    </button>
  );
}
