import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@utils/cn';

const cardVariants = {
  default: 'border border-border bg-white shadow-card',
  elevated: 'bg-white shadow-modal',
  outlined: 'border border-border bg-white',
  flat: 'bg-surface-secondary',
} as const;

const cardPaddings = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
  none: '',
} as const;

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  padding?: keyof typeof cardPaddings;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl',
        cardVariants[variant],
        cardPaddings[padding],
        interactive && 'cursor-pointer transition-shadow hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-text-primary', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center justify-end gap-3 border-t border-border pt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { CardHeader as Header, CardTitle as Title, CardBody as Body, CardFooter as Footer };
export default Card;
