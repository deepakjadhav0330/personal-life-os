import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  autoResize?: boolean;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, helper, autoResize = true, className, wrapperClassName, onChange, id, ...props
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || innerRef;
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const resize = () => {
    const el = textareaRef.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(resize, [props.value]);

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={textareaId} className="text-xs font-medium text-content-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={textareaId}
        rows={3}
        className={cn(
          'w-full rounded-input glass-input text-content-primary placeholder:text-content-muted',
          'transition-all duration-200 text-base p-3 resize-none',
          error ? 'border-danger/60' : '',
          className,
        )}
        onChange={e => { resize(); onChange?.(e); }}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {helper && !error && <p className="text-xs text-content-muted">{helper}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
