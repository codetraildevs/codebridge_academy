import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { UsageMeter } from '@components/ui/usage-meter';
import { subscriptionService, type OrganizationUsageRow } from '@services/subscription-service';
import { useOrgUsage } from '@hooks/use-org-usage';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  Landmark,
  TrendingUp,
} from 'lucide-react';

const PAGE_SIZE = 20;

/** Platform owner — org-wide usage table. */
function OrganizationsUsageView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['usage-organizations'],
    queryFn: () => subscriptionService.getOrganizationsUsage(),
  });
  const rows: OrganizationUsageRow[] = data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Usage</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform-wide assessment usage across all organizations
        </p>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading usage…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load usage data.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No organizations yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-3">Organization</div>
              <div className="lg:col-span-2">Plan</div>
              <div className="lg:col-span-2">Assessments</div>
              <div className="lg:col-span-2">Billing Cycle</div>
              <div className="lg:col-span-1">Pending</div>
              <div className="lg:col-span-2">Total Billed</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.organizationId}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                >
                  <div className="lg:col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 shrink-0 text-text-tertiary" />
                      <p className="truncate text-sm font-medium text-text-primary">{row.organizationName}</p>
                    </div>
                    <p className="pl-6 truncate text-xs text-text-tertiary">{row.code}</p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="truncate text-sm text-text-secondary">{row.planName ?? 'No plan'}</p>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="max-w-[140px]">
                      <UsageMeter
                        used={row.totalAssessmentsUsed}
                        max={row.maxAssessments}
                        label=""
                        tone="binary"
                        atCapacity={row.maxAssessments > 0 && row.totalAssessmentsUsed >= row.maxAssessments}
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {row.totalAssessmentsUsed} / {row.maxAssessments > 0 ? row.maxAssessments : '—'}
                    </p>
                  </div>
                  <div className="lg:col-span-2 text-sm text-text-secondary">
                    {row.billingCycle === 'PER_EXAM'
                      ? 'Per exam'
                      : row.billingCycle === 'ANNUAL'
                        ? 'Annual'
                        : row.billingCycle === 'MONTHLY'
                          ? 'Monthly'
                          : row.billingCycle}
                  </div>
                  <div className="lg:col-span-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        row.pendingBills > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-tertiary text-text-tertiary',
                      )}
                    >
                      {row.pendingBills}
                    </span>
                  </div>
                  <div className="lg:col-span-2 text-sm font-medium text-text-primary">
                    {row.totalBilled.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** Org staff — own org usage + billing records. */
function OrgUsageView() {
  const usage = useOrgUsage();
  const [page, setPage] = useState(1);

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['usage-records', page],
    queryFn: () => subscriptionService.getOrgUsageRecords({ page, limit: PAGE_SIZE }),
  });

  const items = records?.data ?? [];
  const meta = records?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Usage</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your organization's assessment usage and billing activity
        </p>
      </div>

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              Assessment Usage
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <UsageMeter
              used={usage.totalAssessmentsUsed}
              max={usage.maxAssessments}
              label="Assessments used"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Plan</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{usage.planName ?? 'No plan'}</p>
                <p className="text-xs text-text-tertiary">
                  {usage.billingCycle === 'PER_EXAM' ? 'Per exam billing' : usage.billingCycle}
                </p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Pending Bills</p>
                <p className="mt-1 text-lg font-bold text-text-primary">{usage.pendingBills}</p>
                <p className="text-xs text-text-tertiary">
                  {usage.pricePerExam > 0 ? `RWF ${usage.pricePerExam.toLocaleString()} / exam` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-xs text-text-tertiary">Total Billed</p>
                <p className="mt-1 text-lg font-bold text-text-primary">{usage.totalBilled}</p>
                <p className="text-xs text-text-tertiary">BILLED records</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="!p-0">
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          <div className="lg:col-span-5">Assessment</div>
          <div className="lg:col-span-3">Candidate</div>
          <div className="lg:col-span-2">Status</div>
          <div className="lg:col-span-2">Date</div>
        </div>
        {recordsLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-text-tertiary">
            Loading records…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No usage records yet.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {items.map((r) => (
                <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
                  <div className="lg:col-span-5 truncate text-sm text-text-primary">
                    {r.examRegistration?.exam?.title ?? 'Assessment'}
                  </div>
                  <div className="lg:col-span-3 truncate text-sm text-text-secondary">
                    {[r.examRegistration?.candidate?.firstName, r.examRegistration?.candidate?.lastName]
                      .filter(Boolean)
                      .join(' ') || r.examRegistration?.candidate?.email || '—'}
                  </div>
                  <div className="lg:col-span-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        r.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700'
                          : r.status === 'BILLED'
                            ? 'bg-accent-50 text-accent-700'
                            : 'bg-surface-tertiary text-text-tertiary',
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="lg:col-span-2 text-xs text-text-tertiary">
                    {formatDate(r.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta || meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta || meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta?.totalPages ?? p, p + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export function UsagePage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.role === 'PLATFORM_OWNER';

  return <>{isPlatformOwner ? <OrganizationsUsageView /> : <OrgUsageView />}</>;
}

export default UsagePage;
