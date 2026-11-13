import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
  snapPoints?: boolean;
}

export function BottomSheet({ open, onClose, title, children, className, hideClose, snapPoints }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-space-950/70 backdrop-blur-xs" onClick={onClose} />
      {/* Sheet */}
      <div
        className={cn(
          'relative glass-elevated rounded-t-[20px] shadow-glass animate-slide-up pb-safe',
          snapPoints ? 'max-h-[90dvh]' : 'max-h-[85dvh]',
          'overflow-y-auto',
          className,
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            {title && <h2 className="text-base font-semibold text-content-primary">{title}</h2>}
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto w-9 h-9 flex items-center justify-center rounded-input glass-1 text-content-muted hover:text-content-primary transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
