import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

const badgeVariants = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  error: 'bg-error-light text-error-dark',
  info: 'bg-info-light text-info-dark',
  neutral: 'bg-surface-tertiary text-text-secondary',
} as const;

const badgeSizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
} as const;

interface BadgeProps {
  variant?: keyof typeof badgeVariants;
  size?: keyof typeof badgeSizes;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'error' && 'bg-error',
            variant === 'info' && 'bg-info',
            variant === 'neutral' && 'bg-text-tertiary',
          )}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
