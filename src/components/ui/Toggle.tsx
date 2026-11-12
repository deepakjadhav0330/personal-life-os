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
  const trackSize = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const thumbSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const thumbTranslate = size === 'sm'
    ? (checked ? 'translate-x-4' : 'translate-x-0.5')
    : (checked ? 'translate-x-5' : 'translate-x-1');

  if (label || description) {
    return (
      <div className={cn('flex items-center justify-between gap-3', className)}>
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-content-primary">{label}</span>}
          {description && <span className="text-xs text-content-muted">{description}</span>}
        </div>
        <ToggleButton checked={checked} onChange={onChange} disabled={disabled}
          trackSize={trackSize} thumbSize={thumbSize} thumbTranslate={thumbTranslate} />
      </div>
    );
  }

  return (
    <ToggleButton checked={checked} onChange={onChange} disabled={disabled}
      trackSize={trackSize} thumbSize={thumbSize} thumbTranslate={thumbTranslate}
      className={className} />
  );
}

function ToggleButton({ checked, onChange, disabled, trackSize, thumbSize, thumbTranslate, className }: any) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative shrink-0 rounded-full transition-colors duration-200',
        trackSize,
        checked ? 'accent-gradient' : 'bg-white/[0.12]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200',
          thumbSize, thumbTranslate,
        )}
      />
    </button>
  );
}
