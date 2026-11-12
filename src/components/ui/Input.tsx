import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label, error, helper, leftElement, rightElement,
  className, wrapperClassName, id, ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-content-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <div className="absolute left-3 text-content-muted pointer-events-none">
            {leftElement}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-11 rounded-input glass-input text-content-primary placeholder:text-content-muted',
            'transition-all duration-200 text-base',
            leftElement ? 'pl-10' : 'pl-3',
            rightElement ? 'pr-10' : 'pr-3',
            error ? 'border-danger/60 focus:border-danger' : '',
            className,
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 text-content-muted">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {helper && !error && <p className="text-xs text-content-muted">{helper}</p>}
    </div>
  );
});
Input.displayName = 'Input';
