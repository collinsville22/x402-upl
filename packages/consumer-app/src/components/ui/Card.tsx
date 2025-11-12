import { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'accent';
  children: ReactNode;
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  const variants = {
    default: 'rounded-lg border border-x402-border bg-x402-surface',
    hover: 'rounded-lg border border-x402-border bg-x402-surface transition-all hover:border-x402-accent/30 hover:bg-x402-surface-hover cursor-pointer',
    accent: 'rounded-lg border border-x402-accent/20 bg-x402-accent-muted',
  };

  return (
    <div className={clsx(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
