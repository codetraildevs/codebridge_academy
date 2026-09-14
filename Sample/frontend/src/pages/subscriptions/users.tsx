import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { UsageMeter } from '@components/ui/usage-meter';
import { AssignSubscriptionModal } from './components/AssignSubscriptionModal';
import { subscriptionService, type UserSubscriptionRow, type PaginatedMeta } from '@services/subscription-service';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  Loader2,
  AlertCircle,
  Inbox,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ['ACTIVE', 'TRIAL', 'PENDING', 'EXPIRED', 'CANCELLED'];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-accent-100 text-accent-700',
  TRIAL: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-50 text-yellow-800',
  EXPIRED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const selectClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-surface-tertiary text-text-tertiary',
      )}
    >
      {(status === 'ACTIVE' || status === 'TRIAL') && <CheckCircle2 className="h-3 w-3" />}
      {(status === 'PENDING' || status === 'EXPIRED' || status === 'CANCELLED') && <Clock className="h-3 w-3" />}
      {status}
    </span>
  );
}

function fullName(row: UserSubscriptionRow): string {
  return [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email;
}

export function UserSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editingUser, setEditingUser] = useState<UserSubscriptionRow | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-subscriptions', page, search, status],
    queryFn: () =>
      subscriptionService.listUserSubscriptions({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
      }),
  });

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans-individual'],
    queryFn: () => subscriptionService.listPlans('INDIVIDUAL'),
    enabled: !!editingUser,
  });

  const saveMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof subscriptionService.setUserSubscription>[1] }) =>
      subscriptionService.setUserSubscription(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
    },
  });

  const rows = data?.data ?? [];
  const meta: PaginatedMeta | undefined = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">User Subscriptions</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Individual user accounts and their subscription plans
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={cn(selectClass, 'sm:w-44')}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading users…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load user subscriptions.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No users match your filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-4">User</div>
              <div className="lg:col-span-2">Plan</div>
              <div className="lg:col-span-2">Status</div>
              <div className="lg:col-span-2">Free Assessments</div>
              <div className="lg:col-span-2">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                >
                  <div className="lg:col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50">
                        <User className="h-3.5 w-3.5 text-primary-600" />
                      </div>
                      <p className="truncate text-sm font-medium text-text-primary">{fullName(user)}</p>
                    </div>
                    <p className="pl-9 truncate text-xs text-text-tertiary">{user.email}</p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="truncate text-sm text-text-secondary">{user.subscriptionPlan?.name ?? 'No plan'}</p>
                    {user.subscriptionEndAt && (
                      <p className="text-xs text-text-tertiary">Expires {formatDate(user.subscriptionEndAt, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    <StatusBadge status={user.subscriptionStatus} />
                  </div>
                  <div className="lg:col-span-2">
                    <div className="max-w-[120px]">
                      <UsageMeter
                        used={user.freeAssessmentsUsed}
                        max={user.maxFreeAssessments}
                        label=""
                        tone="binary"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {user.freeAssessmentsUsed} / {user.maxFreeAssessments}
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <Button variant="secondary" size="xs" onClick={() => setEditingUser(user)}>
                      <Pencil className="h-3 w-3" />
                      Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {(meta?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-text-tertiary">
              Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} users
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

      {editingUser && (
        <AssignSubscriptionModal
          entityName={fullName(editingUser)}
          currentPlanId={editingUser.subscriptionPlanId}
          currentPlanName={editingUser.subscriptionPlan?.name}
          plans={plans ?? []}
          onClose={() => setEditingUser(null)}
          onSave={(payload) => saveMutation.mutateAsync({ userId: editingUser.id, payload })}
        />
      )}
    </div>
  );
}

export default UserSubscriptionsPage;
