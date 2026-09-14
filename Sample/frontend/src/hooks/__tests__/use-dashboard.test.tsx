import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type * as ReactQuery from '@tanstack/react-query';
import { useAuthStore } from '@stores/auth-store';
import {
  usePlatformDashboard,
  useOrganizationDashboard,
  useRoleDashboard,
  useDashboardQuery,
} from '../use-dashboard';

// ── Mock dashboard service so real queries can resolve ──

vi.mock('@services/dashboard-service', () => ({
  dashboardService: {
    getPlatformOverview: vi.fn().mockResolvedValue({
      organizations: { total: 12, active: 10, inactive: 1, pending: 1, byType: {}, newThisMonth: 2 },
      users: { total: 45, platformOwners: 1, organizationOwners: 5, admins: 8, designers: 6, assessors: 10, reviewers: 3, candidates: 8, individualCandidates: 4, activeUsers: 40 },
      candidates: { total: 28, active: 25 },
      exams: { total: 8, draft: 2, published: 4, inProgress: 1, completed: 1, archived: 0 },
      subscriptions: { totalActiveSubscriptions: 5, planDistribution: [] },
      recentActivity: [],
      monthlyRegistrations: [],
      platformHealth: { uptime: 86400, version: '1.0.0', totalOrganizations: 12, totalUsers: 45, totalCandidates: 28, totalExams: 8, activeOrganizations: 10, activeUsers: 40, publishedExams: 4, completedAssessments: 15 },
      seatUsage: { totalSeats: 600, seatsUsed: 120, nearCapacity: [], topByUsage: [] },
      seatUsageTrend: [],
    }),
    getOrganizationDashboard: vi.fn().mockResolvedValue({
      orgName: 'CodeBridge Academy', orgType: 'TVET_SCHOOL',
      totalUsers: 15, totalCandidates: 80, totalExams: 4, activeExams: 2,
      completedAssessments: 120, passRate: 72.5, averageScore: 68,
      totalCertificates: 25, subscriptionStatus: 'ACTIVE', maxCandidates: 100,
      seatUsageTrend: [],
      usage: { planName: 'Professional', billingCycle: 'MONTHLY', maxAssessments: 5000, totalAssessmentsUsed: 320 },
    }),
    getRoleDashboard: vi.fn().mockImplementation((role: string) => {
      const dashboards: Record<string, any> = {
        DESIGNER: { welcomeMessage: 'Design assessments', stats: [], quickActions: [], recentItems: [] },
        ASSESSOR: { welcomeMessage: 'Review submissions', stats: [], quickActions: [], recentItems: [] },
        ORGANIZATION_REVIEWER: { welcomeMessage: 'Verify assessments', stats: [], quickActions: [], recentItems: [] },
        CANDIDATE: { welcomeMessage: 'Complete assessments', stats: [], quickActions: [], recentItems: [] },
        INDIVIDUAL_CANDIDATE: { welcomeMessage: 'Take assessments', stats: [], quickActions: [], recentItems: [] },
      };
      return Promise.resolve(dashboards[role] ?? { welcomeMessage: 'Welcome', stats: [], quickActions: [], recentItems: [] });
    }),
  },
}));

// ── Spy on useQuery to capture options ───────

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof ReactQuery>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (opts: any) => {
      mockUseQuery(opts);
      return actual.useQuery(opts);
    },
  };
});

// ── Test wrappers ────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

// ── Helpers ──────────────────────────────────

function setUser(overrides: Record<string, any>) {
  useAuthStore.setState({
    user: {
      id: '1', email: 'test@test.com',
      firstName: 'Test', lastName: 'User',
      role: 'PLATFORM_OWNER', isActive: true, mfaEnabled: false,
      ...overrides,
    },
    isAuthenticated: true,
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
  });
}

/**
 * Find the most recent useQuery call whose queryKey matches the predicate.
 */
function findQueryCall(queryKeyMatcher: (key: readonly unknown[]) => boolean) {
  const calls = mockUseQuery.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const opts = calls[i]?.[0];
    if (opts?.queryKey && queryKeyMatcher(opts.queryKey)) {
      return opts;
    }
  }
  return null;
}

function platformCall() {
  return findQueryCall((k) => k[0] === 'dashboard' && k[1] === 'platform');
}

function orgCall() {
  return findQueryCall((k) => k[0] === 'dashboard' && k[1] === 'organization');
}

function roleCall() {
  return findQueryCall((k) => k[0] === 'dashboard' && k[1] === 'role');
}

beforeEach(() => {
  mockUseQuery.mockClear();
  useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null });
});

// ════════════════════════════════════════════
//  usePlatformDashboard
// ════════════════════════════════════════════

describe('usePlatformDashboard', () => {
  it('enables query when role is PLATFORM_OWNER', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    const opts = platformCall();
    expect(opts).not.toBeNull();
    expect(opts!.enabled).toBe(true);
  });

  it('disables query when role is not PLATFORM_OWNER', () => {
    setUser({ role: 'ORGANIZATION_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    const opts = platformCall();
    expect(opts).not.toBeNull();
    expect(opts!.enabled).toBe(false);
  });

  it('disables query for ASSESSOR role', () => {
    setUser({ role: 'ASSESSOR' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    expect(platformCall()!.enabled).toBe(false);
  });

  it('sets refetchInterval to 30_000', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    expect(platformCall()!.refetchInterval).toBe(30_000);
  });

  it('sets staleTime to 15_000 for PLATFORM_OWNER', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    expect(platformCall()!.staleTime).toBe(15_000);
  });

  it('sets retry to 2', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    expect(platformCall()!.retry).toBe(2);
  });

  it('uses platform queryKey', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => usePlatformDashboard(), { wrapper });

    expect(platformCall()!.queryKey).toEqual(['dashboard', 'platform']);
  });
});

// ════════════════════════════════════════════
//  useOrganizationDashboard
// ════════════════════════════════════════════

describe('useOrganizationDashboard', () => {
  it('enables query when role is ORGANIZATION_OWNER with orgId', () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    const opts = orgCall();
    expect(opts).not.toBeNull();
    expect(opts!.enabled).toBe(true);
  });

  it('enables query when role is ADMIN with orgId', () => {
    setUser({ role: 'ADMIN', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.enabled).toBe(true);
  });

  it('disables query when role is PLATFORM_OWNER', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.enabled).toBe(false);
  });

  it('disables query when role is ASSESSOR', () => {
    setUser({ role: 'ASSESSOR', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.enabled).toBe(false);
  });

  it('sets refetchInterval to 60_000', () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.refetchInterval).toBe(60_000);
  });

  it('sets staleTime to 15_000 for ORGANIZATION_OWNER', () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.staleTime).toBe(15_000);
  });

  it('sets retry to 2', () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.retry).toBe(2);
  });

  it('uses organization queryKey containing orgId', () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    renderHook(() => useOrganizationDashboard(), { wrapper });

    expect(orgCall()!.queryKey).toEqual(['dashboard', 'organization', 'org-abc']);
  });

  it('queryFn throws error when orgId is missing', async () => {
    setUser({ role: 'ORGANIZATION_OWNER' }); // no organizationId
    renderHook(() => useOrganizationDashboard(), { wrapper });

    const opts = orgCall();
    expect(opts).not.toBeNull();
    // enabled is true because role matches, but queryFn should throw
    expect(opts!.enabled).toBe(true);
    await expect(opts!.queryFn()).rejects.toThrow('No organization linked to your account');
  });
});

// ════════════════════════════════════════════
//  useRoleDashboard
// ════════════════════════════════════════════

describe('useRoleDashboard', () => {
  it('disables query when role is PLATFORM_OWNER', () => {
    setUser({ role: 'PLATFORM_OWNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(false);
  });

  it('disables query when role is ORGANIZATION_OWNER', () => {
    setUser({ role: 'ORGANIZATION_OWNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(false);
  });

  it('disables query when role is ADMIN', () => {
    setUser({ role: 'ADMIN' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(false);
  });

  it('enables query when role is DESIGNER', () => {
    setUser({ role: 'DESIGNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(true);
  });

  it('enables query when role is ASSESSOR', () => {
    setUser({ role: 'ASSESSOR' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(true);
  });

  it('enables query when role is ORGANIZATION_REVIEWER', () => {
    setUser({ role: 'ORGANIZATION_REVIEWER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(true);
  });

  it('enables query when role is CANDIDATE', () => {
    setUser({ role: 'CANDIDATE' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(true);
  });

  it('enables query when role is INDIVIDUAL_CANDIDATE', () => {
    setUser({ role: 'INDIVIDUAL_CANDIDATE' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(true);
  });

  it('disables query when role is empty string', () => {
    setUser({ role: '' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.enabled).toBe(false);
  });

  it('sets staleTime to 300_000 (5 min) for non-real-time roles', () => {
    setUser({ role: 'DESIGNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.staleTime).toBe(300_000);
  });

  it('sets retry to 1', () => {
    setUser({ role: 'DESIGNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.retry).toBe(1);
  });

  it('uses role queryKey containing the role name', () => {
    setUser({ role: 'DESIGNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.queryKey).toEqual(['dashboard', 'role', 'DESIGNER']);
  });

  it('has no refetchInterval (polling disabled for non-real-time roles)', () => {
    setUser({ role: 'DESIGNER' });
    renderHook(() => useRoleDashboard(), { wrapper });

    expect(roleCall()!.refetchInterval).toBeUndefined();
  });
});

// ════════════════════════════════════════════
//  useDashboardQuery (combined)
// ════════════════════════════════════════════

describe('useDashboardQuery (combined)', () => {
  it('returns overview for PLATFORM_OWNER from sub-query data', async () => {
    setUser({ role: 'PLATFORM_OWNER' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.overview).toBeDefined());
    expect(result.current.orgData).toBeUndefined();
    expect(result.current.roleData).toBeUndefined();
  });

  it('returns orgData for ORGANIZATION_OWNER from sub-query data', async () => {
    setUser({ role: 'ORGANIZATION_OWNER', organizationId: 'org-abc' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.orgData).toBeDefined());
    expect(result.current.overview).toBeUndefined();
    expect(result.current.roleData).toBeUndefined();
  });

  it('returns roleData for ASSESSOR from sub-query data', async () => {
    setUser({ role: 'ASSESSOR' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.roleData).toBeDefined());
    expect(result.current.overview).toBeUndefined();
    expect(result.current.orgData).toBeUndefined();
  });

  it('returns roleData for DESIGNER from sub-query data', async () => {
    setUser({ role: 'DESIGNER' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.roleData).toBeDefined());
  });

  it('returns roleData for INDIVIDUAL_CANDIDATE from sub-query data', async () => {
    setUser({ role: 'INDIVIDUAL_CANDIDATE' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.roleData).toBeDefined());
  });

  it('exposes refetch function', async () => {
    setUser({ role: 'PLATFORM_OWNER' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.overview).toBeDefined());
    expect(typeof result.current.refetch).toBe('function');
  });

  it('returns isFetching as boolean', async () => {
    setUser({ role: 'PLATFORM_OWNER' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.overview).toBeDefined());
    expect(typeof result.current.isFetching).toBe('boolean');
  });

  it('returns isFetching for ASSESSOR', async () => {
    setUser({ role: 'ASSESSOR' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.roleData).toBeDefined());
    expect(typeof result.current.isFetching).toBe('boolean');
  });

  it('returns isLoading as boolean for PLATFORM_OWNER', async () => {
    setUser({ role: 'PLATFORM_OWNER' });
    const { result } = renderHook(() => useDashboardQuery(), { wrapper });

    await waitFor(() => expect(result.current.overview).toBeDefined());
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
