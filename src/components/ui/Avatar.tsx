import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ name, color = '#7c3aed', size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white', sizeClasses[size], className)}
      style={{ background: `linear-gradient(135deg, ${color}, ${adjustColor(color)})` }}
    >
      {initials}
    </div>
  );
}

function adjustColor(hex: string): string {
  // Slightly shift hue for gradient
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(r + 30, 255)}, ${g}, ${Math.min(b + 50, 255)})`;
  } catch { return hex; }
}
