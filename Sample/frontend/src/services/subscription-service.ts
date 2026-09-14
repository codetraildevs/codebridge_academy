import { api } from './api';
import type { SubscriptionPlan } from '../types';
import type { SeatTrendRow } from './dashboard-service';

export interface UsageStats {
  planName: string | null;
  billingCycle: string;
  pricePerExam: number;
  totalAssessmentsUsed: number;
  maxAssessments: number;
  pendingBills: number;
  totalBilled: number;
}

export interface OrgStats {
  totalUsers: number;
  totalCandidates: number;
  totalExams: number;
  activeExams: number;
  completedAssessments: number;
  passRate: number;
  averageScore: number;
  totalCertificates: number;
  /** Last 6 months of candidate seats consumed by this org (one Candidate row per seat). */
  seatUsageTrend: SeatTrendRow[];
  usage: UsageStats | null;
}

export interface FreeTrialStatus {
  freeAssessmentsUsed: number;
  maxFreeAssessments: number;
  subscriptionStatus: string;
  hasRemaining: boolean;
}

export const subscriptionService = {
  async listPlans(planType?: 'INDIVIDUAL' | 'ORGANIZATION'): Promise<SubscriptionPlan[]> {
    const params = planType ? { planType } : {};
    const response = await api.get('/subscription-plans', { params });
    return response.data.data;
  },

  async getOrgProfile(): Promise<any> {
    const response = await api.get('/organizations/profile');
    return response.data.data;
  },

  /** Current user's org usage — the FLAT UsageStats shape from /usage/stats. */
  async getOrgStats(): Promise<UsageStats> {
    const response = await api.get('/usage/stats');
    return response.data.data;
  },

  /** Full org stats (cards + nested usage) from the org stats endpoint. */
  async getOrgStatsById(organizationId: string): Promise<OrgStats> {
    const response = await api.get(`/organizations/${organizationId}/stats`);
    return response.data.data;
  },

  /** Platform-wide usage rows (platform owner only). */
  async getOrganizationsUsage(): Promise<OrganizationUsageRow[]> {
    const response = await api.get('/usage/organizations');
    return response.data.data;
  },

  /** Own org usage records (paginated). */
  async getOrgUsageRecords(params?: { page?: number; limit?: number }): Promise<UsageRecordsResponse> {
    const response = await api.get('/usage/records', { params });
    return response.data;
  },

  // ── Platform Owner: organization subscriptions ──

  async listOrganizationSubscriptions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    planType?: string;
  }): Promise<{ data: OrganizationSubscriptionRow[]; meta: PaginatedMeta }> {
    const response = await api.get('/subscriptions/organizations', { params });
    return response.data;
  },

  async setOrganizationSubscription(
    organizationId: string,
    payload: { planId?: string; status?: string; durationDays?: number; note?: string },
  ): Promise<OrganizationSubscriptionRow> {
    const response = await api.put(`/subscriptions/organizations/${organizationId}`, payload);
    return response.data.data;
  },

  async cancelOrganizationSubscription(
    organizationId: string,
    payload: { reason: string; feedback?: string; cancelImmediately?: boolean },
  ): Promise<{ cancelAt: string; status: string }> {
    const response = await api.post(`/subscriptions/organizations/${organizationId}/cancel`, payload);
    return response.data.data;
  },

  async reactivateOrganizationSubscription(
    organizationId: string,
  ): Promise<{ status: string; subscriptionEndAt: string | null }> {
    const response = await api.post(`/subscriptions/organizations/${organizationId}/reactivate`);
    return response.data.data;
  },

  /** An organization's subscription-change history (plan changes, cancellations, reactivations). */
  async getOrganizationSubscriptionHistory(organizationId: string): Promise<{
    organization: { id: string; name: string; code: string };
    data: SubscriptionChangeRow[];
  }> {
    const response = await api.get(`/subscriptions/organizations/${organizationId}/changes`);
    return response.data;
  },

  // ── Platform Owner: individual user subscriptions ──

  async listUserSubscriptions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: UserSubscriptionRow[]; meta: PaginatedMeta }> {
    const response = await api.get('/subscriptions/users', { params });
    return response.data;
  },

  async setUserSubscription(
    userId: string,
    payload: { planId?: string; status?: string; durationDays?: number; note?: string },
  ): Promise<UserSubscriptionRow> {
    const response = await api.put(`/subscriptions/users/${userId}`, payload);
    return response.data.data;
  },
};

export interface OrganizationUsageRow {
  organizationId: string;
  organizationName: string;
  code: string;
  subscriptionStatus: string;
  planName: string | null;
  billingCycle: string;
  pricePerExam: number;
  maxAssessments: number;
  totalAssessmentsUsed: number;
  pendingBills: number;
  totalBilled: number;
}

export interface UsageRecordsResponse {
  data: Array<{
    id: string;
    status: string;
    price: number;
    billingCycle: string;
    createdAt: string;
    examRegistration?: {
      exam?: { title?: string | null };
      candidate?: { firstName?: string | null; lastName?: string | null; email?: string | null };
    };
  }>;
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

// ── Platform Owner: subscription management ──

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface OrganizationSubscriptionRow {
  id: string;
  name: string;
  code: string;
  organizationType: string | null;
  email: string | null;
  isActive: boolean;
  subscriptionPlanId: string | null;
  subscriptionStatus: string;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  maxUsers: number;
  maxCandidates: number;
  maxJobPostings: number;
  totalUsers: number;
  totalCandidates: number;
  createdAt: string;
  subscriptionPlan?: SubscriptionPlan | null;
}

export interface SubscriptionChangeRow {
  id: string;
  action: string;
  status: string;
  previousPlanId: string | null;
  newPlanId: string | null;
  previousPlanName: string | null;
  newPlanName: string | null;
  reason: string | null;
  feedback: string | null;
  cancelImmediately: boolean;
  cancelAt: string | null;
  createdAt: string;
}

export interface UserSubscriptionRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  freeAssessmentsUsed: number;
  maxFreeAssessments: number;
  subscriptionPlanId: string | null;
  subscriptionStatus: string;
  subscriptionStartAt: string | null;
  subscriptionEndAt: string | null;
  createdAt: string;
  subscriptionPlan?: {
    id: string;
    name: string;
    planType: string;
    billingCycle: string;
    price: number;
    maxAssessments: number;
  } | null;
}

export default subscriptionService;
