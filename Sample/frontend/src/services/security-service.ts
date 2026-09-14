import { api } from './api';

export interface SecurityEventRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  severity: string;
  ipAddress: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
  userId: string | null;
}

export interface SecurityOverview {
  stats: {
    totalUsers: number;
    activeUsers: number;
    mfaAdoptionRate: number;
    mfaEnabledUsers: number;
    securityEvents: number;
  };
  severityBreakdown: Array<{ severity: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string | null;
    severity: string;
    ipAddress: string | null;
    timestamp: string;
    details: Record<string, unknown> | null;
  }>;
}

export const securityApi = {
  async getOverview(): Promise<SecurityOverview> {
    const { data } = await api.get('/security/overview');
    return data.data;
  },

  async listEvents(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: SecurityEventRow[]; meta: { page: number; limit: number; totalItems: number; totalPages: number } }> {
    const { data } = await api.get('/security/events', { params });
    return data;
  },
};

export default securityApi;
