import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = {
  primary:
    'bg-[#2965ff] text-white hover:bg-[#1a4fd6] focus:ring-[#2965ff] active:bg-[#123db3]',
  secondary:
    'border border-gray-300 bg-white text-text-primary hover:bg-surface-tertiary focus:ring-gray-400 active:bg-surface-secondary',
  ghost:
    'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary focus:ring-gray-400',
  danger:
    'bg-error text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
  success:
    'bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500 active:bg-accent-800',
  link:
    'text-[#2965ff] underline-offset-4 hover:underline focus:ring-[#2965ff]',
} as const;

const buttonSizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      iconOnly = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          iconOnly && 'p-2',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {!iconOnly && (loading ? 'Loading...' : children)}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
