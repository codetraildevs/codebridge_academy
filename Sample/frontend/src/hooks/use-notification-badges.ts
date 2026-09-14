import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@stores/auth-store';
import { notificationsApi, type InboxResult } from '@services/notifications-service';

export const notificationKeys = {
  badges: ['notifications', 'badges'] as const,
  inbox: ['notifications', 'inbox'] as const,
};

const EMPTY_BADGES: NotificationBadges = { byRoute: {}, total: 0 };
const EMPTY_INBOX: InboxResult = { items: [], unread: 0 };

/** Route → badge count. Only routes with a non-zero count are present. */
interface NotificationBadges {
  byRoute: Record<string, number>;
  /** Aggregate count for the header bell. */
  total: number;
}

/**
 * Build the sidebar badge map from the real inbox.
 *
 * Every unread inbox row carries the route of the page it belongs to (e.g.
 * /assessor-review for review tasks) — those routes line up with sidebar nav
 * items, so the counts badge the right entries. Announcements without a nav
 * route are excluded from the map but still count toward `total`.
 */
function inboxToBadges(inbox: InboxResult): NotificationBadges {
  const byRoute: Record<string, number> = {};
  let total = 0;
  for (const item of inbox.items) {
    if (!item.isRead) {
      total += 1;
      if (item.route && item.route !== '/dashboard') {
        byRoute[item.route] = (byRoute[item.route] ?? 0) + 1;
      }
    }
  }
  return { byRoute, total };
}

/**
 * Live notification badge counts for the sidebar, backed by the real
 * `/api/notifications` inbox.
 *
 * - Polls every 45s so counts stay fresh while the app is open
 * - Refetches on window focus (returning to the tab)
 * - Falls back to an empty badge map while loading or on error, so the
 *   navigation never blocks or flashes on badge data
 */
export function useNotificationBadges() {
  const user = useAuthStore((s) => s.user);

  return useQuery<NotificationBadges>({
    queryKey: notificationKeys.badges,
    queryFn: async () => {
      const inbox = await notificationsApi.getInbox();
      return inboxToBadges(inbox);
    },
    enabled: !!user,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    placeholderData: EMPTY_BADGES,
  });
}

/**
 * The header-bell inbox, backed by the real `/api/notifications` table.
 *
 * Returns the unread count (for the bell badge) and the latest items (for the
 * dropdown). Polls alongside the sidebar badges; the dropdown data is cached
 * for 30s so reopening it is instant. Falls back to an empty inbox on error.
 */
export function useNotificationInbox() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery<InboxResult>({
    queryKey: notificationKeys.inbox,
    queryFn: () => notificationsApi.getInbox(),
    enabled: !!user,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    placeholderData: EMPTY_INBOX,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.inbox });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.inbox });
      const prev = queryClient.getQueryData<InboxResult>(notificationKeys.inbox);
      if (prev) {
        const target = prev.items.find((item) => item.id === id);
        queryClient.setQueryData<InboxResult>(notificationKeys.inbox, {
          items: prev.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
          unread: prev.unread - (target && !target.isRead ? 1 : 0),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(notificationKeys.inbox, ctx.prev);
    },
    onSuccess: invalidate,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.badges });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.inbox });
      const prev = queryClient.getQueryData<InboxResult>(notificationKeys.inbox);
      if (prev) {
        queryClient.setQueryData<InboxResult>(notificationKeys.inbox, {
          items: prev.items.map((item) => ({ ...item, isRead: true })),
          unread: 0,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(notificationKeys.inbox, ctx.prev);
    },
    onSuccess: invalidate,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.badges });
    },
  });

  return {
    inbox: query.data ?? EMPTY_INBOX,
    unreadCount: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}

export default useNotificationBadges;
