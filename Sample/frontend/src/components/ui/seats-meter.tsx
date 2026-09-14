import type { ReactNode } from 'react';
import { cn } from '@utils/cn';
import { Badge } from './badge';

interface SeatsMeterProps {
  /** Seats consumed. */
  used: number;
  /** Seat capacity from the plan. Values >= 999999 are uncapped. */
  max: number;
  /**
   * 'card' — label row + full-width bar (+ optional limit hint), used on the
   *          org dashboard Subscription card.
   * 'chip' — compact badge ("80/100 seats" / "Unlimited seats"), used in the
   *          org dashboard header.
   * 'table'— compact used/max + thin bar, used in the platform org table and
   *          anywhere a per-org inline meter fits.
   */
  variant?: 'card' | 'chip' | 'table';
  /** 'card' variant: caption shown to the left of the readout. */
  label?: string;
  /** 'card' variant: render the "Seat limit reached" hint under the bar. */
  showLimitHint?: boolean;
  /** 'card' variant: node appended to the hint row (e.g. an Upgrade link). */
  limitHintAction?: ReactNode;
  className?: string;
}

/**
 * Shared candidate-seat meter. A 0 cap (plan-less org) renders an empty bar —
 * it isn't "at capacity", enrollment is simply unavailable. Uncapped plans
 * (max >= 999999) read "Unlimited" and hide the bar.
 */
export function SeatsMeter({
  used,
  max,
  variant = 'card',
  label,
  showLimitHint = false,
  limitHintAction,
  className,
}: SeatsMeterProps) {
  const unlimited = max >= 999999;
  const atCapacity = !unlimited && max > 0 && used >= max;
  // A 0 cap (plan-less org) is "no capacity defined" — never show a full bar.
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;

  if (variant === 'chip') {
    return (
      <Badge variant={atCapacity ? 'error' : 'neutral'} size="sm" dot className={className}>
        {unlimited ? 'Unlimited seats' : `${used}/${max} seats`}
      </Badge>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('w-full max-w-[110px]', className)}>
        <div className="flex items-center text-xs">
          <span className={cn('font-medium', atCapacity ? 'text-error' : 'text-text-primary')}>
            {used}/{unlimited ? 'Unlimited' : max}
          </span>
        </div>
        {!unlimited && (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                atCapacity ? 'bg-error' : 'bg-primary-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // card variant
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs">
        {label && <span className="text-text-secondary">{label}</span>}
        <span className={cn('font-medium', atCapacity ? 'text-error' : 'text-text-primary')}>
          {used} / {unlimited ? 'Unlimited' : max}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              atCapacity ? 'bg-error' : 'bg-primary-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {showLimitHint && atCapacity && (
        <p className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-error">Seat limit reached</span>
          {limitHintAction}
        </p>
      )}
    </div>
  );
}

export default SeatsMeter;
