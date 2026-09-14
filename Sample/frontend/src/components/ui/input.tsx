import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onPasswordToggle?: () => void;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      prefix,
      suffix,
      showPasswordToggle,
      passwordVisible,
      onPasswordToggle,
      fullWidth,
      className,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasRightContent = suffix || showPasswordToggle;

    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-[#000100] transition-colors duration-150"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-[#b8b8b8]" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-[#b8b8b8] transition-colors duration-150 group-focus-within:text-[#000100]">
                {icon}
              </span>
            </div>
          )}
          {prefix && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-[13px] text-[#b8b8b8]">{prefix}</span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'block w-full rounded-full border bg-white px-3 py-2.5 text-[14px] text-[#000100]',
              'placeholder:text-[#b8b8b8]',
              'transition-all duration-150 ease-out',
              'focus:outline-none focus:ring-1 focus:ring-[#000100]/20 focus:border-[#000100]',
              'hover:border-[#b8b8b8]',
              error
                ? 'border-[#dc2626] focus:ring-[#dc2626]/20 focus:border-[#dc2626] hover:border-[#dc2626]'
                : 'border-[#b8b8b8]/50',
              disabled && 'cursor-not-allowed bg-[#f5f5f5] opacity-50',
              (icon || prefix) && 'pl-10',
              hasRightContent && 'pr-10',
              fullWidth && 'w-full',
              className,
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : hint
                  ? `${inputId}-hint`
                  : undefined
            }
            {...props}
          />

          {hasRightContent && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
              {showPasswordToggle && onPasswordToggle && (
                <button
                  type="button"
                  onClick={onPasswordToggle}
                  disabled={disabled}
                  className={cn(
                    'flex items-center justify-center rounded-md p-1',
                    'text-[#b8b8b8] hover:text-[#000100] hover:bg-[#f5f5f5]',
                    'transition-all duration-150',
                    'focus:outline-none',
                    disabled && 'cursor-not-allowed opacity-50',
                  )}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {passwordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
              {suffix && !showPasswordToggle && (
                <span className="text-[13px] text-[#b8b8b8]">{suffix}</span>
              )}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1.5 text-[12px] text-[#dc2626]"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="text-[12px] text-[#b8b8b8]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
