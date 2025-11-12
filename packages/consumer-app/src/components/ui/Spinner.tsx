import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-x402-border border-t-x402-accent',
        sizes[size],
        className
      )}
    />
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-x402-black">
      <div className="text-center">
        <Spinner size="lg" />
        {message && <p className="mt-4 text-sm text-x402-text-tertiary">{message}</p>}
      </div>
    </div>
  );
}
