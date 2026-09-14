import { cn } from '@utils/cn';

interface UsageMeterProps {
  /** Units consumed. */
  used: number;
  /** Capacity. Values >= 999999 display as "Unlimited". */
  max: number;
  /** Optional caption shown to the left of the used/max readout. */
  label?: string;
  /** Width class for the bar track (defaults to w-full). */
  className?: string;
  /** Force the critical (red) state — e.g. enrollment is blocked at the cap. */
  atCapacity?: boolean;
  /**
   * 'auto' (default) applies the 80%/95% warning/critical thresholds.
   * 'binary' keeps accent below `atCapacity` and red at/above it — for callers
   * whose contract is "red only when the action is actually blocked".
   */
  tone?: 'auto' | 'binary';
}

/**
 * A compact used/max meter with a threshold-colored progress bar.
 * - `tone='auto'`: < 80% accent, 80–94% warning, >= 95% critical (red)
 * - `tone='binary'`: accent below `atCapacity`, red at/above it
 */
export function UsageMeter({ used, max, label, className, atCapacity = false, tone = 'auto' }: UsageMeterProps) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isWarning = tone === 'auto' && pct >= 80;
  const isCritical = atCapacity || (tone === 'auto' && pct >= 95);

  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-text-secondary">{label}</span>
          <span
            className={cn(
              'font-medium',
              isCritical ? 'text-error' : isWarning ? 'text-warning' : 'text-text-primary',
            )}
          >
            {used} / {max >= 999999 ? 'Unlimited' : max}
          </span>
        </div>
      )}
      <div className={cn('h-2 overflow-hidden rounded-full bg-surface-tertiary', className ?? 'w-full')}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isCritical ? 'bg-error' : isWarning ? 'bg-warning' : 'bg-accent-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default UsageMeter;
