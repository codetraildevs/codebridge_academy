import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { subscriptionService, type SubscriptionChangeRow } from '@services/subscription-service';
import { cn } from '@utils/cn';
import { formatDate, timeAgo } from '@utils/format';
import {
  Loader2,
  AlertCircle,
  Inbox,
  ArrowLeft,
  Pencil,
  Ban,
  RotateCcw,
  History,
  Landmark,
} from 'lucide-react';

const ACTION_STYLES: Record<string, { title: string; icon: typeof Pencil; iconClass: string; detail: (c: SubscriptionChangeRow) => string }> = {
  CHANGE_PLAN: {
    title: 'Plan changed',
    icon: Pencil,
    iconClass: 'bg-primary-50 text-primary-600',
    detail: (c) => {
      if (c.previousPlanName && c.newPlanName) return `${c.previousPlanName} → ${c.newPlanName}`;
      if (c.newPlanName) return `Assigned ${c.newPlanName}`;
      if (c.previousPlanName) return `Removed ${c.previousPlanName}`;
      return 'Plan assignment updated';
    },
  },
  CANCEL: {
    title: 'Subscription cancelled',
    icon: Ban,
    iconClass: 'bg-red-50 text-red-600',
    detail: (c) => (c.cancelImmediately ? 'Cancelled immediately' : 'Cancelled at end of billing period'),
  },
  REACTIVATE: {
    title: 'Subscription reactivated',
    icon: RotateCcw,
    iconClass: 'bg-accent-50 text-accent-600',
    detail: (c) => (c.newPlanName ? c.newPlanName : 'Subscription renewed'),
  },
};

function ChangeRow({ change }: { change: SubscriptionChangeRow }) {
  const style = ACTION_STYLES[change.action] ?? {
    title: change.action.replace(/_/g, ' ').toLowerCase(),
    icon: History,
    iconClass: 'bg-surface-tertiary text-text-secondary',
    detail: () => '',
  };
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-3 py-4">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', style.iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{style.title}</p>
          <p
            className="shrink-0 text-xs text-text-tertiary"
            title={formatDate(change.createdAt, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          >
            {timeAgo(change.createdAt)}
          </p>
        </div>
        {style.detail(change) && <p className="text-sm text-text-secondary">{style.detail(change)}</p>}
        {change.reason && <p className="mt-0.5 text-xs text-text-tertiary">{change.reason}</p>}
        {change.action === 'CANCEL' && change.cancelAt && (
          <p className="mt-0.5 text-xs text-text-tertiary">
            Effective {formatDate(change.cancelAt, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        )}
        {change.feedback && (
          <p className="mt-0.5 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-xs text-text-secondary">
            Feedback: {change.feedback}
          </p>
        )}
      </div>
    </div>
  );
}

export function SubscriptionHistoryPage() {
  const { organizationId = '' } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-subscription-changes', organizationId],
    queryFn: () => subscriptionService.getOrganizationSubscriptionHistory(organizationId),
    enabled: !!organizationId,
  });

  const org = data?.organization;
  const changes = data?.data ?? [];
  const actionCounts = changes.reduce<Record<string, number>>((acc, c) => {
    acc[c.action] = (acc[c.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/subscriptions')} className="mb-3">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Organization Subscriptions
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <Landmark className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Subscription History</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {org ? `${org.name} · ${org.code}` : 'Loading organization…'}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-text-tertiary">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading history…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-20 text-center">
          <AlertCircle className="h-8 w-8 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">Couldn't load subscription history.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : changes.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No subscription changes recorded for this organization yet.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card variant="elevated" className="!p-4">
              <p className="text-xs text-text-tertiary">Total Changes</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{changes.length}</p>
            </Card>
            <Card variant="elevated" className="!p-4">
              <p className="text-xs text-text-tertiary">Plan Changes</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{actionCounts['CHANGE_PLAN'] ?? 0}</p>
            </Card>
            <Card variant="elevated" className="!p-4">
              <p className="text-xs text-text-tertiary">Cancellations</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{actionCounts['CANCEL'] ?? 0}</p>
            </Card>
            <Card variant="elevated" className="!p-4">
              <p className="text-xs text-text-tertiary">Reactivations</p>
              <p className="mt-1 text-xl font-bold text-text-primary">{actionCounts['REACTIVATE'] ?? 0}</p>
            </Card>
          </div>

          <Card className="!p-0">
            <div className="divide-y divide-border px-5">
              {changes.map((c) => (
                <ChangeRow key={c.id} change={c} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default SubscriptionHistoryPage;
