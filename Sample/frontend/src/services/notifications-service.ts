import { api } from './api';

// ── Inbox (header bell) ─────────────────────────

/** A single inbox row shown in the header bell dropdown. */
export interface InboxItem {
  id: string;
  kind: 'review' | 'submission' | 'result' | 'alert' | 'announcement';
  title: string;
  description: string;
  route: string;
  isRead: boolean;
  timestamp: string | null;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: { route?: string } | null;
  isRead: boolean;
  channel: string;
  createdAt: string;
  readAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
}

export interface NotificationsStats {
  total: number;
  unread: number;
  byType: Array<{ type: string; count: number }>;
}

export interface InboxResult {
  items: InboxItem[];
  unread: number;
}

const MAX_INBOX_ITEMS = 8;

function kindForType(type: string): InboxItem['kind'] {
  switch (type) {
    case 'ASSESSMENT_REVIEW': return 'review';
    case 'SUBMISSION_COMPLETE': return 'submission';
    case 'RESULT_RELEASED':
    case 'CERTIFICATE_GENERATED': return 'result';
    case 'ACCOUNT_LOCKED':
    case 'PASSWORD_CHANGED': return 'alert';
    case 'SYSTEM_ANNOUNCEMENT':
    default: return 'announcement';
  }
}

function routeForType(type: string, data: { route?: string } | null): string {
  if (data?.route) return data.route;
  switch (type) {
    case 'ASSESSMENT_REVIEW': return '/assessor-review';
    case 'SUBMISSION_COMPLETE': return '/candidate-portal/submissions';
    case 'RESULT_RELEASED': return '/candidate-portal/submissions?status=completed';
    case 'CERTIFICATE_GENERATED': return '/certificates';
    case 'SYSTEM_ANNOUNCEMENT':
    default: return '/notifications';
  }
}

function mapRowToItem(row: NotificationRow): InboxItem {
  return {
    id: row.id,
    kind: kindForType(row.type),
    title: row.title,
    description: row.message,
    route: routeForType(row.type, row.data),
    isRead: row.isRead,
    timestamp: row.createdAt,
  };
}

/**
 * Admin inbox API (platform owner) — full list with pagination, stats,
 * per-row read state, and compose-broadcast. The admin page renders the raw
 * rows, so these return the server shape rather than mapped InboxItems.
 */
export const notificationsAdminApi = {
  async list(params?: {
    type?: string;
    channel?: string;
    isRead?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: NotificationRow[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  async stats(): Promise<NotificationsStats> {
    const { data } = await api.get('/notifications/stats');
    return data.data;
  },

  async markRead(id: string): Promise<NotificationRow> {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data.data;
  },

  async markAllRead(): Promise<{ updated: number }> {
    const { data } = await api.post('/notifications/read-all');
    return data.data;
  },

  async compose(input: {
    title: string;
    message: string;
    type?: string;
    channel?: string;
    userId?: string;
    role?: string;
  }): Promise<{ delivered: number }> {
    const { data } = await api.post('/notifications', input);
    return data.data;
  },
};

export const notificationsApi = {
  /** Fetch the header-bell inbox: unread count + latest items (self-scoped). */
  async getInbox(): Promise<InboxResult> {
    const [list, stats] = await Promise.all([
      api.get('/notifications', { params: { limit: MAX_INBOX_ITEMS, self: 'true' } }),
      api.get('/notifications/stats', { params: { self: 'true' } }),
    ]);
    const items: NotificationRow[] = list.data.data ?? [];
    return {
      items: items.map(mapRowToItem),
      unread: stats.data.data?.unread ?? 0,
    };
  },

  async list(params?: {
    type?: string;
    channel?: string;
    isRead?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: NotificationRow[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  async stats(): Promise<NotificationsStats> {
    const { data } = await api.get('/notifications/stats');
    return data.data;
  },

  async markRead(id: string): Promise<NotificationRow> {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data.data;
  },

  async markAllRead(): Promise<{ updated: number }> {
    const { data } = await api.post('/notifications/read-all');
    return data.data;
  },

  async compose(input: {
    title: string;
    message: string;
    type?: string;
    channel?: string;
    userId?: string;
    role?: string;
  }): Promise<{ delivered: number }> {
    const { data } = await api.post('/notifications', input);
    return data.data;
  },
};

export default notificationsApi;
