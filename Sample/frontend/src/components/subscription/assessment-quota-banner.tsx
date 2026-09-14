import { Link } from 'react-router-dom';
import { ArrowRight, Gauge } from 'lucide-react';
import { cn } from '@utils/cn';
import { UsageMeter } from '@components/ui/usage-meter';
import type { UsageStats } from '@services/subscription-service';

interface AssessmentQuotaBannerProps {
  /** Org usage stats; renders nothing while undefined/null (no plan / loading). */
  usage?: UsageStats | null;
}

/**
 * Shows the organization's assessment-volume quota (registrations used vs
 * plan.maxAssessments) with a progress bar. When the cap is hit — which is
 * exactly when bulk enroll / candidate self-registration start failing with
 * 403 — it turns into a warning with a "switch to per-exam billing" CTA.
 * PER_EXAM billing and uncapped plans are displayed as "unlimited" (no bar).
 */
export function AssessmentQuotaBanner({ usage }: AssessmentQuotaBannerProps) {
  if (!usage) return null;

  const unlimited = usage.billingCycle === 'PER_EXAM' || usage.maxAssessments >= 999999;
  const used = usage.totalAssessmentsUsed;
  const max = unlimited ? null : usage.maxAssessments;
  // Plan-less orgs report maxAssessments 0; enrollment is blocked for them just
  // like an at-cap org, so they get the same alert — but with accurate copy.
  const noPlan = max === 0;
  const atCap = !unlimited && (noPlan || used >= (max ?? 0));

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        atCap ? 'border-error-light bg-error-light/60' : 'border-border bg-surface-secondary/40',
      )}
      role={atCap ? 'alert' : 'status'}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            atCap ? 'bg-error-light text-error' : 'bg-accent-50 text-accent-600',
          )}
        >
          <Gauge className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {noPlan ? 'No active subscription' : atCap ? 'Assessment quota reached' : 'Organization assessment quota'}
          </p>
          <p className="text-xs text-text-secondary">
            {noPlan
              ? 'Registration is paused until a plan is chosen'
              : `${used} of ${unlimited ? 'unlimited' : max} registrations used${atCap ? ' · registration is paused until the plan is upgraded' : ''}`}
            {usage.planName && !noPlan ? ` · ${usage.planName} plan` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Binary tone: blue below the cap, red only when registration is
            actually paused (atCap, incl. the max=0 no-plan case). */}
        {!unlimited && <UsageMeter used={used} max={max ?? 0} atCapacity={atCap} tone="binary" className="w-28" />}
        {atCap && (
          <Link
            to="/settings/plans"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            Switch to per-exam billing
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default AssessmentQuotaBanner;
