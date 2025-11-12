import { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: ReactNode;
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const variants = {
    success: 'border-x402-success/20 bg-x402-success/10 text-x402-success',
    warning: 'border-x402-warning/20 bg-x402-warning/10 text-x402-warning',
    error: 'border-x402-error/20 bg-x402-error/10 text-x402-error',
    info: 'border-x402-info/20 bg-x402-info/10 text-x402-info',
    neutral: 'border-x402-border bg-x402-surface text-x402-text-secondary',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
