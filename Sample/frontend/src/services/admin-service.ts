import { api } from './api';
import type { ApiResponse, PaginationMeta } from '@app_types/index';

// ── Types ──────────────────────────────────────────

export interface PlatformStats {
  organizations: {
    total: number;
    pending: number;
    recentLast7Days: number;
  };
  users: { total: number };
  candidates: { total: number };
  exams: { total: number; published: number };
  certificates: { total: number };
  subscriptions: { activePlans: number };
  revenue: { totalBilled: number };
}

export interface AdminOrganization {
  id: string;
  name: string;
  code: string;
  organizationType: string;
  email: string | null;
  phone: string | null;
  isVerified: boolean;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionPlanId: string | null;
  maxUsers: number;
  maxCandidates: number;
  createdAt: string;
  subscriptionPlan?: { id: string; name: string; planType: string } | null;
  _count: {
    users: number;
    candidates: number;
    exams: number;
  };
}

export interface AdminOrganizationDetail extends AdminOrganization {
  website?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
  maxJobPostings: number;
  subscriptionPlan?: {
    id: string;
    name: string;
    planType: string;
    environmentConfig: PlanEnvironmentConfig | null;
  } | null;
  _count: {
    users: number;
    candidates: number;
    exams: number;
    certificates: number;
  };
  usage: {
    totalRecords: number;
    totalBilled: number;
  };
}

export interface PlanEnvironmentConfig {
  id: string;
  subscriptionPlanId: string;
  allowPracticalExam: boolean;
  allowTheoreticalExam: boolean;
  allowMixedExam: boolean;
  allowedSectionTypes: string[];
  allowedAssessmentTypes: string[];
  enableAiScoring: boolean;
  enableAiOralDefense: boolean;
  enableAiPlagiarismCheck: boolean;
  enableAiFeedback: boolean;
  enableAiLearningRecs: boolean;
  enableDynamicWorkspace: boolean;
  enableDiagramEditor: boolean;
  enableCodeEditor: boolean;
  enableFileUpload: boolean;
  enableWebcamProctoring: boolean;
  enableFullScreenLockdown: boolean;
  enableOralDefense: boolean;
  enablePortfolioBuilder: boolean;
  enableCertificateIssue: boolean;
  maxDurationPerExam: number;
  maxSectionsPerExam: number;
  maxQuestionsPerSection: number;
  allowOrgOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: string;
  organizationId: string | null;
  phone: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  freeAssessmentsUsed: number;
  maxFreeAssessments: number;
  subscriptionStatus: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  organization?: { id: string; name: string } | null;
}

export interface SubscriptionPlanDetail {
  id: string;
  planType: string;
  name: string;
  description: string | null;
  price: number;
  pricePerExam: number;
  currency: string;
  billingCycle: string;
  durationDays: number;
  maxUsers: number;
  maxCandidates: number;
  maxAssessments: number;
  maxJobPostings: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  environmentConfig?: PlanEnvironmentConfig | null;
}

export interface AdminAssessment {
  id: string;
  title: string;
  tradeName: string;
  status: string;
  duration: number;
  passingScore: number;
  registeredCount: number;
  completedCount: number;
  createdAt: string;
}

export interface AdminCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  registrationNumber: string;
  trade: string | null;
  enrollmentDate: string;
  assessmentsCompleted: number;
  averageScore: number | null;
}

export interface AssessmentReport {
  id: string;
  title: string;
  tradeName: string;
  examType: string;
  passRate: number;
  averageScore: number;
  totalRegistered: number;
  totalCompleted: number;
  totalPassed: number;
}

export interface CandidateReport {
  id: string;
  firstName: string;
  lastName: string;
  trade: string | null;
  completedAssessments: number;
  averageScore: number | null;
  competencyScore: number | null;
  certificatesCount: number;
}

// ── Service ────────────────────────────────────────

export const adminService = {
  // ── Platform Stats ───────────────────────────
  async getStats(): Promise<PlatformStats> {
    const response = await api.get<ApiResponse<PlatformStats>>('/admin/stats');
    return response.data.data;
  },

  // ── Organization Management ──────────────────
  async listOrganizations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
    subscriptionStatus?: string;
  }): Promise<{ data: AdminOrganization[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<AdminOrganization[]> & { meta: PaginationMeta }
    >('/admin/organizations', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  async getOrganizationDetail(
    organizationId: string,
  ): Promise<AdminOrganizationDetail> {
    const response = await api.get<ApiResponse<AdminOrganizationDetail>>(
      `/admin/organizations/${organizationId}`,
    );
    return response.data.data;
  },

  async verifyOrganization(organizationId: string): Promise<void> {
    await api.put(`/admin/organizations/${organizationId}/verify`);
  },

  async updateOrganizationSubscription(
    organizationId: string,
    data: {
      subscriptionPlanId?: string;
      subscriptionStatus?: string;
      maxUsers?: number;
      maxCandidates?: number;
      maxJobPostings?: number;
    },
  ): Promise<void> {
    await api.put(
      `/admin/organizations/${organizationId}/subscription`,
      data,
    );
  },

  async getOrganizationEnvironment(organizationId: string): Promise<{
    organizationId: string;
    planName: string | null;
    environmentConfig: PlanEnvironmentConfig | null;
  }> {
    const response = await api.get<
      ApiResponse<{
        organizationId: string;
        planName: string | null;
        environmentConfig: PlanEnvironmentConfig | null;
      }>
    >(`/admin/organizations/${organizationId}/environment`);
    return response.data.data;
  },

  // ── Assessment (Exam) Management ───────────────
  async listAssessments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: AdminAssessment[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<AdminAssessment[]> & { meta: PaginationMeta }
    >('/admin/assessments', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  async listTrades(): Promise<Array<{ id: string; name: string }>> {
    const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>(
      '/admin/trades',
    );
    return response.data.data;
  },

  async createExam(payload: CreateExamPayload): Promise<void> {
    await api.post('/exams', payload);
  },

  async getExamDetail(examId: string): Promise<AdminExamDetail> {
    const response = await api.get<ApiResponse<AdminExamDetail>>(`/exams/${examId}`);
    return response.data.data;
  },

  async publishExam(examId: string): Promise<void> {
    await api.post(`/exams/${examId}/publish`);
  },

  async deleteExam(examId: string): Promise<void> {
    await api.post(`/exams/${examId}/archive`);
  },

  // ── Candidate Management ───────────────────────
  async listCandidates(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ data: AdminCandidate[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<AdminCandidate[]> & { meta: PaginationMeta }
    >('/admin/candidates', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  async assignAssessment(data: {
    examId: string;
    candidateIds: string[];
  }): Promise<{ message: string }> {
    await Promise.all(
      data.candidateIds.map((candidateId) =>
        api.post(`/exams/${data.examId}/register-candidate`, { candidateId }),
      ),
    );
    return { message: `Assessment assigned to ${data.candidateIds.length} candidate(s)` };
  },

  async importCandidates(payload: {
    candidates: Array<{
      email: string;
      firstName: string;
      lastName: string;
      phone?: string | null;
      tradeId?: string | null;
      registrationNumber?: string | null;
    }>;
  }): Promise<{ results: ImportResult[] }> {
    const response = await api.post<ApiResponse<{ results: ImportResult[] }>>(
      '/admin/candidates/import',
      payload,
    );
    return response.data.data;
  },

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
  }): Promise<{ email: string; firstName: string; lastName: string; temporaryPassword?: string }> {
    const response = await api.post<
      ApiResponse<{ email: string; firstName: string; lastName: string; temporaryPassword?: string }>
    >('/admin/users', data);
    return response.data.data;
  },

  // ── Reports ────────────────────────────────────
  async getAssessmentReports(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: AssessmentReport[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<AssessmentReport[]> & { meta: PaginationMeta }
    >('/admin/reports/assessments', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  async getCandidateReports(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: CandidateReport[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<CandidateReport[]> & { meta: PaginationMeta }
    >('/admin/reports/candidates', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  // ── User Management ──────────────────────────
  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    organizationId?: string;
  }): Promise<{ data: AdminUser[]; meta: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<AdminUser[]> & { meta: PaginationMeta }
    >('/admin/users', { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      isActive?: boolean;
      role?: string;
    },
  ): Promise<void> {
    await api.put(`/admin/users/${userId}`, data);
  },

  // ── Subscription Plan Management ─────────────
  // ── User Activation/Deactivation ────────────
  async activateUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/activate`);
  },

  async deactivateUser(userId: string): Promise<void> {
    await api.post(`/admin/users/${userId}/deactivate`);
  },

  // ── Subscription Plan Management ─────────────
  async updatePlan(
    planId: string,
    data: {
      name?: string;
      description?: string | null;
      price?: number;
      pricePerExam?: number;
      billingCycle?: string;
      durationDays?: number;
      maxUsers?: number;
      maxCandidates?: number;
      maxAssessments?: number;
      maxJobPostings?: number;
      features?: string[];
      isActive?: boolean;
    },
  ): Promise<void> {
    await api.put(`/admin/subscription-plans/${planId}`, data);
  },

  async updatePlanEnvironment(
    planId: string,
    data: Partial<Omit<PlanEnvironmentConfig, 'id' | 'subscriptionPlanId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    await api.put(`/admin/subscription-plans/${planId}/environment`, data);
  },

  // ── Individual Candidates (for env management) ──
  async listIndividualCandidates(): Promise<AdminUser[]> {
    const response = await api.get<ApiResponse<AdminUser[]>>('/admin/subscribers/individuals');
    return response.data.data;
  },

  // ── Subscriber Environment Config ─────────────────
  async getSubscriberEnvironment(
    subscriberType: 'organization' | 'user',
    subscriberId: string,
  ): Promise<SubscriberEnvironmentResponse> {
    const response = await api.get<ApiResponse<SubscriberEnvironmentResponse>>(
      `/admin/subscribers/${subscriberType}/${subscriberId}/environment`,
    );
    return response.data.data;
  },

  async updateSubscriberEnvironment(
    subscriberType: 'organization' | 'user',
    subscriberId: string,
    data: Partial<Omit<PlanEnvironmentConfig, 'id' | 'subscriptionPlanId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<void> {
    await api.put(
      `/admin/subscribers/${subscriberType}/${subscriberId}/environment`,
      data,
    );
  },

  async deleteSubscriberEnvironment(
    subscriberType: 'organization' | 'user',
    subscriberId: string,
  ): Promise<void> {
    await api.delete(
      `/admin/subscribers/${subscriberType}/${subscriberId}/environment`,
    );
  },
};

export interface SubscriberEnvironmentResponse {
  subscriber: {
    id: string;
    name: string;
    email?: string;
    type: 'ORGANIZATION' | 'INDIVIDUAL_USER';
  };
  planEnvironmentConfig: PlanEnvironmentConfig | null;
  subscriberEnvironmentConfig: PlanEnvironmentConfig | null;
  effectiveConfig: PlanEnvironmentConfig | null;
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  tradeId: string;
  examType: 'PRACTICAL' | 'THEORETICAL' | 'MIXED';
  duration: number;
  passingScore: number;
  maxAttempts: number;
  instructions?: string;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  sections: Array<{
    title: string;
    description?: string;
    orderIndex: number;
    sectionType: string;
    weight: number;
    duration?: number;
    questions: Array<{
      questionText: string;
      questionType: string;
      points: number;
      orderIndex: number;
      options?: string[];
      correctAnswer?: string;
      expectedOutput?: string;
    }>;
  }>;
}

export interface AdminExamDetail {
  id: string;
  title: string;
  description?: string | null;
  examType: string;
  status: string;
  tradeId: string;
  tradeName?: string;
  duration: number;
  passingScore: number;
  maxAttempts: number;
  instructions?: string | null;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sections?: unknown[];
}

export interface ImportResult {
  row: number;
  email: string;
  status: 'created' | 'skipped' | 'error';
  message?: string;
}
