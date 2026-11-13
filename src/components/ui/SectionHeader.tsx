import { cn } from '../../utils/cn';

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Add margin-bottom automatically (default: true) */
  mb?: boolean;
}

/**
 * Unified section header token.
 * Replaces: text-xs font-semibold text-content-muted uppercase tracking-wide mb-3
 * Used as card section labels, widget section titles, and form group headers.
 */
export function SectionHeader({ children, className, mb = true }: SectionHeaderProps) {
  return (
    <p className={cn(
      'text-[11px] font-semibold text-content-muted uppercase tracking-widest',
      mb && 'mb-3',
      className,
    )}>
      {children}
    </p>
  );
}
