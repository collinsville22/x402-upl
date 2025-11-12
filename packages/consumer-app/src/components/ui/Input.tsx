import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-x402-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-lg border border-x402-border bg-x402-surface px-4 py-3 text-x402-text-primary placeholder-x402-text-muted transition-colors',
            'focus:border-x402-accent focus:outline-none focus:ring-1 focus:ring-x402-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-x402-error focus:border-x402-error focus:ring-x402-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-x402-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
