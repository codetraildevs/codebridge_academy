import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { UsageMeter } from '@components/ui/usage-meter';
import { AssignSubscriptionModal } from './components/AssignSubscriptionModal';
import { subscriptionService, type OrganizationSubscriptionRow, type PaginatedMeta } from '@services/subscription-service';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  Loader2,
  AlertCircle,
  Inbox,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Ban,
  RotateCcw,
  History,
  X,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['ACTIVE', 'TRIAL', 'PENDING', 'EXPIRED', 'CANCELLED', 'INACTIVE'];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-accent-100 text-accent-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-50 text-yellow-800',
  EXPIRED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const selectClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

function StatusBadge({ status, isActive }: { status: string; isActive: boolean }) {
  const label = status === 'INACTIVE' || (!isActive && status === 'PENDING') ? 'INACTIVE' : status;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[label] ?? (isActive ? 'bg-surface-tertiary text-text-tertiary' : 'bg-red-50 text-red-700'),
      )}
    >
      {(label === 'ACTIVE' || label === 'TRIAL') && <CheckCircle2 className="h-3 w-3" />}
      {(label === 'PENDING' || label === 'EXPIRED' || label === 'CANCELLED') && <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ── Cancel Subscription Modal ───────────────────

function CancelSubscriptionModal({
  org,
  onClose,
  onCancel,
}: {
  org: OrganizationSubscriptionRow;
  onClose: () => void;
  onCancel: (payload: { reason: string; cancelImmediately?: boolean }) => Promise<unknown>;
}) {
  const [reason, setReason] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onCancel({ reason: reason.trim(), cancelImmediately });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to cancel subscription');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-error" />
            <h2 className="text-lg font-semibold text-text-primary">Cancel Subscription</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <p className="text-sm text-text-secondary">
            Cancel the subscription for <strong className="text-text-primary">{org.name}</strong>
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Why is this subscription being cancelled?"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-secondary p-3">
            <input
              type="checkbox"
              checked={cancelImmediately}
              onChange={(e) => setCancelImmediately(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Cancel immediately</span>
              <p className="text-xs text-text-tertiary">End the subscription today instead of at the end of the billing period</p>
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Keep Subscription</Button>
          <Button
            variant="primary"
            className="bg-error hover:bg-error"
            loading={submitting}
            disabled={!reason.trim()}
            onClick={handleSubmit}
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────

export function OrganizationSubscriptionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planType, setPlanType] = useState('');
  const [editingOrg, setEditingOrg] = useState<OrganizationSubscriptionRow | null>(null);
  const [cancellingOrg, setCancellingOrg] = useState<OrganizationSubscriptionRow | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-subscriptions', page, search, status, planType],
    queryFn: () =>
      subscriptionService.listOrganizationSubscriptions({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        planType: planType || undefined,
      }),
  });

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans-org'],
    queryFn: () => subscriptionService.listPlans('ORGANIZATION'),
    enabled: !!editingOrg,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['org-subscriptions'] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ organizationId, payload }: { organizationId: string; payload: Parameters<typeof subscriptionService.setOrganizationSubscription>[1] }) =>
      subscriptionService.setOrganizationSubscription(organizationId, payload),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ organizationId, payload }: { organizationId: string; payload: { reason: string; cancelImmediately?: boolean } }) =>
      subscriptionService.cancelOrganizationSubscription(organizationId, payload),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: (organizationId: string) => subscriptionService.reactivateOrganizationSubscription(organizationId),
    onSuccess: invalidate,
  });

  const rows = data?.data ?? [];
  const meta: PaginatedMeta | undefined = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Organization Subscriptions</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage plans, subscription status, and seat usage across all organizations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or code…"
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={cn(selectClass, 'sm:w-44')}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={planType}
          onChange={(e) => { setPlanType(e.target.value); setPage(1); }}
          className={cn(selectClass, 'sm:w-44')}
        >
          <option value="">All plans</option>
          <option value="ORGANIZATION">Organization</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading organizations…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load organization subscriptions.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No organizations match your filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-3">Organization</div>
              <div className="lg:col-span-2">Plan</div>
              <div className="lg:col-span-1">Status</div>
              <div className="lg:col-span-2">Users</div>
              <div className="lg:col-span-2">Candidates</div>
              <div className="lg:col-span-2">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((org) => {
                const cancellable = ['ACTIVE', 'TRIAL', 'PENDING'].includes(org.subscriptionStatus);
                const reactivatable = ['CANCELLED', 'EXPIRED'].includes(org.subscriptionStatus);
                return (
                  <div
                    key={org.id}
                    className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                  >
                    <div className="lg:col-span-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 shrink-0 text-text-tertiary" />
                        <p className="truncate text-sm font-medium text-text-primary">{org.name}</p>
                      </div>
                      <p className="pl-6 truncate text-xs text-text-tertiary">{org.code}</p>
                    </div>
                    <div className="lg:col-span-2">
                      <p className="truncate text-sm text-text-secondary">{org.subscriptionPlan?.name ?? 'No plan'}</p>
                      {org.subscriptionEndAt && (
                        <p className="text-xs text-text-tertiary">Renews {formatDate(org.subscriptionEndAt, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      )}
                    </div>
                    <div className="lg:col-span-1">
                      <StatusBadge status={org.subscriptionStatus} isActive={org.isActive} />
                    </div>
                    <div className="lg:col-span-2">
                      <div className="max-w-[120px]">
                        <UsageMeter used={org.totalUsers} max={org.maxUsers} label="" tone="binary" />
                      </div>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {org.totalUsers} / {org.maxUsers}
                      </p>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="max-w-[120px]">
                        <UsageMeter used={org.totalCandidates} max={org.maxCandidates} label="" tone="binary" />
                      </div>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {org.totalCandidates} / {org.maxCandidates}
                      </p>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button variant="secondary" size="xs" onClick={() => setEditingOrg(org)}>
                          <Pencil className="h-3 w-3" />
                          Assign
                        </Button>
                        <Button variant="secondary" size="xs" onClick={() => navigate(`/subscriptions/organizations/${org.id}/history`)}>
                          <History className="h-3 w-3" />
                          History
                        </Button>
                        {cancellable && (
                          <Button variant="secondary" size="xs" className="text-error hover:text-error" onClick={() => setCancellingOrg(org)}>
                            <Ban className="h-3 w-3" />
                            Cancel
                          </Button>
                        )}
                        {reactivatable && (
                          <Button
                            variant="secondary"
                            size="xs"
                            loading={reactivateMutation.isPending && reactivateMutation.variables === org.id}
                            onClick={() => reactivateMutation.mutate(org.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(meta?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-text-tertiary">
              Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} organizations
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
      </Card>

      {editingOrg && (
        <AssignSubscriptionModal
          entityName={editingOrg.name}
          currentPlanId={editingOrg.subscriptionPlanId}
          currentPlanName={editingOrg.subscriptionPlan?.name}
          plans={plans ?? []}
          onClose={() => setEditingOrg(null)}
          onSave={(payload) => saveMutation.mutateAsync({ organizationId: editingOrg.id, payload })}
        />
      )}

      {cancellingOrg && (
        <CancelSubscriptionModal
          org={cancellingOrg}
          onClose={() => setCancellingOrg(null)}
          onCancel={(payload) => cancelMutation.mutateAsync({ organizationId: cancellingOrg.id, payload })}
        />
      )}

    </div>
  );
}

export default OrganizationSubscriptionsPage;
