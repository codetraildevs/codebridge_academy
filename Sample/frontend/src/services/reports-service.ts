import { api } from './api';

// ── Pass Rates ──────────────────────────────────

export interface PassRateEntry {
  total: number;
  passed: number;
  passRate: number;
}

export interface PassRateFieldEntry extends PassRateEntry {
  fieldId: string;
}

export interface PassRateMonthlyEntry extends PassRateEntry {
  month: string;
}

export interface PassRatesResponse {
  overall: PassRateEntry;
  byField: PassRateFieldEntry[];
  monthlyTrend: PassRateMonthlyEntry[];
}

// ── Competency Scores ───────────────────────────

export interface CompetencyScore {
  id: string;
  name: string;
  category: string;
  averageScore: number;
  maxScore: number;
  percentage: number;
  totalAssessments: number;
  levelDistribution: Record<string, number>;
}

export interface CompetencyCategory {
  category: string;
  averageScore: number;
  maxScore: number;
  percentage: number;
  competencyCount: number;
}

export interface CompetencySummary {
  totalCompetencies: number;
  totalAssessments: number;
  overallAverage: number;
}

export interface CompetencyScoresResponse {
  competencies: CompetencyScore[];
  byCategory: CompetencyCategory[];
  summary: CompetencySummary;
}

// ── Submission Trends ───────────────────────────

export interface SubmissionMonthlyEntry {
  month: string;
  total: number;
  completed: number;
  draft: number;
}

export interface ScoreRange {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface SubmissionTrendsResponse {
  monthlyTrend: SubmissionMonthlyEntry[];
  scoreDistribution: ScoreRange[];
  totalSubmissions: number;
  completionRate: number;
}

// ── Overview ────────────────────────────────────

export interface OverviewResponse {
  totals: {
    exams: number;
    candidates: number;
    submissions: number;
    activeCertificates: number;
  };
  passRate: PassRateEntry;
  competencySummary: CompetencySummary;
  competencyCategories: CompetencyCategory[];
}

// ── Service ─────────────────────────────────────

export const reportsApi = {
  async getPassRates(params?: {
    organizationId?: string;
    fieldId?: string;
    from?: string;
    to?: string;
  }): Promise<PassRatesResponse> {
    const { data } = await api.get('/reports/pass-rates', { params });
    return data;
  },

  async getCompetencyScores(params?: {
    organizationId?: string;
    fieldId?: string;
  }): Promise<CompetencyScoresResponse> {
    const { data } = await api.get('/reports/competency-scores', { params });
    return data;
  },

  async getSubmissionTrends(params?: {
    organizationId?: string;
    from?: string;
    to?: string;
  }): Promise<SubmissionTrendsResponse> {
    const { data } = await api.get('/reports/submission-trends', { params });
    return data;
  },

  async getOverview(params?: { organizationId?: string }): Promise<OverviewResponse> {
    const { data } = await api.get('/reports/overview', { params });
    return data;
  },

  // ── Results (completed assessments with scores) ──

  async getResults(params?: {
    organizationId?: string;
    fieldId?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ResultsResponse> {
    const { data } = await api.get('/reports/results', { params });
    return data;
  },

  // ── Candidate / Assessor Reports ──

  async getCandidateReports(params?: {
    organizationId?: string;
    fieldId?: string;
  }): Promise<CandidateReportsResponse> {
    const { data } = await api.get('/reports/candidates', { params });
    return data;
  },

  async getAssessorReports(params?: {
    organizationId?: string;
  }): Promise<AssessorReportsResponse> {
    const { data } = await api.get('/reports/assessors', { params });
    return data;
  },

  async getOrganizationReports(): Promise<OrganizationReportsResponse> {
    const { data } = await api.get('/reports/organizations');
    return data;
  },
};

// ── Results types ────────────────────────────────

export interface ResultRow {
  id: string;
  examId: string;
  examTitle: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    registrationNumber: string;
  };
  totalScore: number;
  passingScore: number;
  passed: boolean;
  completedAt: string | null;
}

export interface ResultsResponse {
  data: ResultRow[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface CandidateReportRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationNumber: string;
  assessmentsTaken: number;
  passed: number;
  passRate: number;
  averageScore: number;
}

export interface CandidateReportsResponse {
  data: CandidateReportRow[];
  meta: { totalItems: number };
}

export interface AssessorReportRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  reviewsCompleted: number;
  averageScore: number;
  lastReviewedAt: string | null;
}

export interface AssessorReportsResponse {
  data: AssessorReportRow[];
  meta: { totalItems: number };
}

export interface OrganizationReportRow {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  totalUsers: number;
  totalCandidates: number;
  totalExams: number;
  assessmentsCompleted: number;
  passed: number;
  passRate: number;
}

export interface OrganizationReportsResponse {
  data: OrganizationReportRow[];
  meta: { totalItems: number };
}

export default reportsApi;
