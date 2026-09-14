import { api } from './api';

// ── Shared Types ────────────────────────────────

export interface MonthlyRegistration {
  month: string;
  year: number;
  organizations: number;
  users: number;
  candidates: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  severity: string;
  timestamp: string;
  userName: string | null;
}

export interface PlanDistribution {
  planName: string;
  planType: string;
  count: number;
}

/**
 * One month of a seat-usage trend. Carries the numeric seat series relevant
 * to the view (platform: orgsAdded + seatsConsumed; org: seatsConsumed).
 *
 * The index signature exists so the shared SeatUsageTrend card can read
 * whatever series its caller configures. Trade-off: a mistyped series key in
 * a caller's `bars` config compiles clean and renders zeros instead of erroring
 * — keep the bar keys in sync with the backend's field names.
 */
export type SeatTrendRow = { month: string; year: number; [key: string]: string | number };

// ── Platform Owner ─────────────────────────────

export interface PlatformOverview {
  organizations: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byType: Record<string, number>;
    newThisMonth: number;
  };
  users: {
    total: number;
    platformOwners: number;
    organizationOwners: number;
    admins: number;
    designers: number;
    assessors: number;
    reviewers: number;
    candidates: number;
    individualCandidates: number;
    activeUsers: number;
  };
  candidates: {
    total: number;
    active: number;
  };
  exams: {
    total: number;
    draft: number;
    published: number;
    inProgress: number;
    completed: number;
    archived: number;
  };
  subscriptions: {
    totalActiveSubscriptions: number;
    planDistribution: PlanDistribution[];
  };
  recentActivity: RecentActivity[];
  monthlyRegistrations: MonthlyRegistration[];
  /** Last 6 months: organizations added vs candidate seats consumed per month. */
  seatUsageTrend: SeatTrendRow[];
  platformHealth: {
    uptime: number;
    version: string;
    totalOrganizations: number;
    totalUsers: number;
    totalCandidates: number;
    totalExams: number;
    activeOrganizations: number;
    activeUsers: number;
    publishedExams: number;
    completedAssessments: number;
  };
  seatUsage: {
    totalSeats: number;
    seatsUsed: number;
    /** Capped-plan orgs at >= 80% seat usage, most-utilized first. */
    nearCapacity: Array<{ id: string; name: string; used: number; max: number }>;
    /** Orgs ranked by absolute seats consumed (top 5). */
    topByUsage: Array<{ id: string; name: string; used: number; max: number }>;
  };
}

// ── Organization Owner / Admin ──────────────────

export interface OrgDashboardData {
  orgName: string;
  orgType: string;
  totalUsers: number;
  totalCandidates: number;
  totalExams: number;
  activeExams: number;
  completedAssessments: number;
  passRate: number;
  averageScore: number;
  totalCertificates: number;
  subscriptionStatus: string | null;
  /** Candidate seat quota — synced from the plan (org profile). */
  maxCandidates: number;
  /** Last 6 months: candidate seats consumed by this org (one Candidate row per seat). */
  seatUsageTrend: SeatTrendRow[];
  usage: {
    planName: string | null;
    billingCycle: string;
    maxAssessments: number;
    totalAssessmentsUsed: number;
  } | null;
}

// ── Other Role Types ────────────────────────────

export interface RoleDashboardData {
  welcomeMessage: string;
  stats: Array<{ label: string; value: number; icon: string }>;
  quickActions: Array<{ label: string; path: string; icon: string }>;
  recentItems: Array<{ title: string; subtitle: string; status: string; timestamp: string }>;
}

// ── Service ─────────────────────────────────────

export const dashboardService = {
  /** Platform Owner — full platform overview */
  async getPlatformOverview(): Promise<PlatformOverview> {
    const response = await api.get('/dashboard/platform-overview');
    return response.data.data;
  },

  /** Organization users (ORG_OWNER, ADMIN) — org-specific stats */
  async getOrganizationDashboard(orgId: string): Promise<OrgDashboardData> {
    const [statsRes, profileRes] = await Promise.all([
      api.get(`/organizations/${orgId}/stats`),
      api.get('/organizations/profile'),
    ]);

    const stats = statsRes.data.data;
    const profile = profileRes.data.data;

    return {
      orgName: profile.name,
      orgType: profile.organizationType,
      maxCandidates: profile.maxCandidates,
      totalUsers: stats.totalUsers,
      totalCandidates: stats.totalCandidates,
      totalExams: stats.totalExams,
      activeExams: stats.activeExams,
      completedAssessments: stats.completedAssessments,
      passRate: stats.passRate,
      averageScore: stats.averageScore,
      totalCertificates: stats.totalCertificates,
      subscriptionStatus: stats.subscriptionStatus,
      seatUsageTrend: (stats.seatUsageTrend ?? []).map((m: SeatTrendRow) => ({
        month: m.month,
        year: m.year,
        seatsConsumed: Number(m.seatsConsumed) || 0,
      })),
      usage: stats.usage
        ? {
            planName: stats.usage.planName,
            billingCycle: stats.usage.billingCycle,
            maxAssessments: stats.usage.maxAssessments,
            totalAssessmentsUsed: stats.usage.totalAssessmentsUsed,
          }
        : null,
    };
  },

  /** Other roles — fetch user-specific dashboard data */
  async getRoleDashboard(role: string): Promise<RoleDashboardData> {
    // For now, return contextual data based on role.
    // In the future, these will call dedicated backend endpoints.
    const dashboards: Record<string, RoleDashboardData> = {
      DESIGNER: {
        welcomeMessage: 'Design assessments, create rubrics, and manage content',
        stats: [
          { label: 'My Drafts', value: 2, icon: 'FileEdit' },
          { label: 'Published', value: 4, icon: 'FileCheck' },
          { label: 'Rubrics', value: 12, icon: 'ListChecks' },
        ],
        quickActions: [
          { label: 'Create Assessment', path: '/exams', icon: 'Plus' },
          { label: 'View Drafts', path: '/exams', icon: 'FileEdit' },
        ],
        recentItems: [],
      },
      ASSESSOR: {
        welcomeMessage: 'Review submissions, evaluate candidates, and finalize scores',
        stats: [
          { label: 'Assigned', value: 3, icon: 'ClipboardList' },
          { label: 'Pending Review', value: 8, icon: 'Clock' },
          { label: 'Completed', value: 15, icon: 'CheckCircle2' },
        ],
        quickActions: [
          { label: 'View Pending Reviews', path: '/assessments', icon: 'ClipboardList' },
          { label: 'View Assessments', path: '/assessments', icon: 'GraduationCap' },
        ],
        recentItems: [],
      },
      ORGANIZATION_REVIEWER: {
        welcomeMessage: 'Verify assessments, review AI scores, and ensure quality',
        stats: [
          { label: 'Pending Verification', value: 5, icon: 'Shield' },
          { label: 'Verified', value: 12, icon: 'CheckCircle2' },
          { label: 'Flagged', value: 1, icon: 'AlertTriangle' },
        ],
        quickActions: [
          { label: 'Review Queue', path: '/assessments', icon: 'ClipboardList' },
          { label: 'View Reports', path: '/reports', icon: 'BarChart3' },
        ],
        recentItems: [],
      },
      CANDIDATE: {
        welcomeMessage: 'Complete your assigned assessments and track your progress',
        stats: [
          { label: 'Assigned', value: 2, icon: 'ClipboardList' },
          { label: 'In Progress', value: 1, icon: 'Clock' },
          { label: 'Completed', value: 3, icon: 'CheckCircle2' },
          { label: 'Certificates', value: 1, icon: 'Award' },
        ],
        quickActions: [
          { label: 'Start Assessment', path: '/assessments', icon: 'Play' },
          { label: 'View Results', path: '/certificates', icon: 'Award' },
        ],
        recentItems: [],
      },
      INDIVIDUAL_CANDIDATE: {
        welcomeMessage: 'Take assessments, build your competency passport, and earn certificates',
        stats: [
          { label: 'Available', value: 5, icon: 'GraduationCap' },
          { label: 'Completed', value: 3, icon: 'CheckCircle2' },
          { label: 'Certificates', value: 1, icon: 'Award' },
        ],
        quickActions: [
          { label: 'Browse Assessments', path: '/assessments', icon: 'Search' },
          { label: 'View Passport', path: '/certificates', icon: 'Award' },
        ],
        recentItems: [],
      },
    };

    return dashboards[role] ?? {
      welcomeMessage: 'Welcome to Qualexas',
      stats: [],
      quickActions: [{ label: 'Go to Dashboard', path: '/dashboard', icon: 'LayoutDashboard' }],
      recentItems: [],
    };
  },
};

export default dashboardService;
