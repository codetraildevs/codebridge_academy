import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { notificationsAdminApi, type NotificationRow } from '@services/notifications-service';
import { Bell, Send, Inbox, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react';
import { formatDate } from '@utils/format';

const PAGE_SIZE = 20;
const NOTIFICATION_TYPES = [
  'EXAM_PUBLISHED',
  'EXAM_REMINDER',
  'SUBMISSION_COMPLETE',
  'RESULT_RELEASED',
  'CERTIFICATE_GENERATED',
  'ASSESSMENT_REVIEW',
  'SYSTEM_ANNOUNCEMENT',
  'PASSWORD_CHANGED',
  'ACCOUNT_LOCKED',
];
const ROLES = ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'DESIGNER', 'ASSESSOR', 'ORGANIZATION_REVIEWER', 'CANDIDATE', 'INDIVIDUAL_CANDIDATE'];

function typeVariant(type: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (type) {
    case 'SYSTEM_ANNOUNCEMENT': return 'info';
    case 'RESULT_RELEASED':
    case 'CERTIFICATE_GENERATED': return 'success';
    case 'ACCOUNT_LOCKED': return 'error';
    case 'EXAM_REMINDER':
    case 'ASSESSMENT_REVIEW': return 'warning';
    default: return 'neutral';
  }
}

export function NotificationsAdminPage() {
  const [type, setType] = useState('');
  const [isRead, setIsRead] = useState('');
  const [page, setPage] = useState(1);
  const [showCompose, setShowCompose] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', type, isRead, page],
    queryFn: () =>
      notificationsAdminApi.list({
        type: type || undefined,
        isRead: isRead || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['notifications-stats'],
    queryFn: notificationsAdminApi.stats,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationsAdminApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: notificationsAdminApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'] });
    },
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="mt-1 text-sm text-text-secondary">
            In-app notification inbox {stats ? `· ${stats.unread} unread of ${stats.total}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => readAllMutation.mutate()} loading={readAllMutation.isPending}>
            Mark all read
          </Button>
          <Button size="sm" icon={<Send className="h-4 w-4" />} onClick={() => setShowCompose(true)}>
            Compose
          </Button>
        </div>
      </div>

      {showCompose && <ComposeForm onDone={() => { setShowCompose(false); queryClient.invalidateQueries({ queryKey: ['notifications'] }); }} />}

      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={isRead}
              onChange={(e) => { setIsRead(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by read state"
            >
              <option value="">All states</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
            <div className="ml-auto flex flex-wrap gap-2">
              {(stats?.byType ?? []).slice(0, 4).map((t) => (
                <Badge key={t.type} variant={typeVariant(t.type)} size="sm">{t.type.replace(/_/g, ' ')} · {t.count}</Badge>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading notifications...</div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Bell className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load notifications.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No notifications match.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {rows.map((n: NotificationRow) => (
                <div key={n.id} className={`flex items-start gap-4 px-5 py-4 ${n.isRead ? '' : 'bg-primary-50/40'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm ${n.isRead ? 'text-text-secondary' : 'font-semibold text-text-primary'}`}>{n.title}</p>
                      <Badge variant={typeVariant(n.type)} size="sm">{n.type.replace(/_/g, ' ')}</Badge>
                      <Badge variant="neutral" size="sm">{n.channel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">{n.message}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      <span>{n.user ? `${n.user.firstName} ${n.user.lastName}` : '—'}</span>
                      <span>·</span>
                      <span>{formatDate(n.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <Button variant="secondary" size="xs" onClick={() => readMutation.mutate(n.id)} loading={readMutation.isPending && readMutation.variables === n.id}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} notifications
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

function ComposeForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM_ANNOUNCEMENT');
  const [channel, setChannel] = useState('IN_APP');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      notificationsAdminApi.compose({
        title: title.trim(),
        message: message.trim(),
        type,
        channel,
        role: role || undefined,
      }),
    onSuccess: (result) => {
      setSuccess(`Notification delivered to ${result.delivered} recipient${result.delivered === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-stats'] });
      setTitle('');
      setMessage('');
      setRole('');
      setTimeout(onDone, 1500);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card variant="outlined">
      <CardHeader>
        <CardTitle>Compose Notification</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Deliver to role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Everyone</option>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="IN_APP">In-app</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="ALL">All channels</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          {success && <p className="text-sm text-accent-700">{success}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onDone}>Cancel</Button>
            <Button size="sm" icon={<Send className="h-4 w-4" />} loading={mutation.isPending} disabled={!title.trim() || !message.trim()} onClick={() => mutation.mutate()}>
              Send
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default NotificationsAdminPage;
