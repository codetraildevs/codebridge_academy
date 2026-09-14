import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { cn } from '@utils/cn';
import {
  AlertTriangle,
  AlertCircle,
  Gauge,
  Users,
  GraduationCap,
  FileCheck,
  TrendingUp,
} from 'lucide-react';

interface UsageLimit {
  label: string;
  used: number;
  max: number;
  unit: string;
  icon: typeof Gauge;
}

interface UsageAlertsSectionProps {
  usage: Array<{
    label: string;
    used: number;
    max: number;
    unit: string;
  }>;
  severity?: 'all' | 'warnings_only';
}

const ICON_MAP: Record<string, typeof Gauge> = {
  assessments: Gauge,
  users: Users,
  candidates: GraduationCap,
  exams: FileCheck,
  jobs: TrendingUp,
};

function UsageAlertBar({ used, max, label, unit }: { used: number; max: number; label: string; unit: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const absMax = max >= 999999;
  const isWarning = pct >= 80 && pct < 95;
  const isCritical = pct >= 95;

  if (pct < 80 && !isWarning && !isCritical) return null;

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      isCritical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50',
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isCritical ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className={cn(
              'text-sm font-medium',
              isCritical ? 'text-red-800' : 'text-yellow-800',
            )}>
              {label} — <strong>{pct.toFixed(0)}%</strong> utilized
            </p>
            <span className={cn(
              'text-xs font-semibold',
              isCritical ? 'text-red-700' : 'text-yellow-700',
            )}>
              {used} / {absMax ? 'Unlimited' : max} {unit}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isCritical ? 'bg-red-500' : 'bg-yellow-500',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={cn(
            'mt-1 text-xs',
            isCritical ? 'text-red-600' : 'text-yellow-600',
          )}>
            {isCritical
              ? 'Action required: Upgrade your plan to avoid service interruption.'
              : 'Recommendation: Consider upgrading to accommodate future growth.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function UsageAlertsSection({
  usage,
  severity = 'all',
}: UsageAlertsSectionProps) {
  const filteredUsage = severity === 'warnings_only'
    ? usage.filter((u) => {
        const pct = u.max > 0 ? (u.used / u.max) * 100 : 0;
        return pct >= 80;
      })
    : usage;

  if (filteredUsage.length === 0) return null;

  const hasAlerts = filteredUsage.some((u) => {
    const pct = u.max > 0 ? (u.used / u.max) * 100 : 0;
    return pct >= 80;
  });

  return (
    <Card id="usage-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className={cn(
            'h-5 w-5',
            hasAlerts ? 'text-warning' : 'text-accent-500',
          )} />
          Usage Status
          {hasAlerts && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
              <AlertTriangle className="h-3 w-3" />
              Attention Needed
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {filteredUsage.map((item) => {
          const pct = item.max > 0 ? (item.used / item.max) * 100 : 0;
          const key = item.label.toLowerCase().replace(/\s+/g, '_');
          const Icon = ICON_MAP[key] || Gauge;

          // Show all limits with their progress bars
          return (
            <div key={item.label} className="rounded-lg bg-surface-secondary p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    pct >= 95 ? 'bg-red-100' : pct >= 80 ? 'bg-yellow-100' : 'bg-accent-100',
                  )}>
                    <Icon className={cn(
                      'h-3.5 w-3.5',
                      pct >= 95 ? 'text-red-500' : pct >= 80 ? 'text-yellow-500' : 'text-accent-500',
                    )} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                </div>
                <span className={cn(
                  'text-xs font-semibold',
                  pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-yellow-600' : 'text-text-primary',
                )}>
                  {item.used} / {item.max >= 999999 ? 'Unlimited' : item.max} {item.unit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-accent-500',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className={cn(
                  'text-[10px]',
                  pct >= 95 ? 'text-red-500' : pct >= 80 ? 'text-yellow-500' : 'text-text-tertiary',
                )}>
                  {pct.toFixed(0)}% used
                </span>
                {pct >= 80 && (
                  <span className="text-[10px] font-medium text-text-tertiary">
                    {item.max - item.used} remaining
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

export default UsageAlertsSection;
