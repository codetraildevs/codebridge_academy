import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '@pages/dashboard';
import { dashboardService } from '@services/dashboard-service';
import { roleService } from '@services/role-service';
import type { PlatformOverview, OrgDashboardData, RoleDashboardData } from '@services/dashboard-service';
import { useAuthStore } from '@stores/auth-store';

// ── Mocks ──────────────────────────────────

vi.mock('@services/dashboard-service', () => ({
  dashboardService: {
    getPlatformOverview: vi.fn(),
    getOrganizationDashboard: vi.fn(),
    getRoleDashboard: vi.fn(),
  },
}));

vi.mock('@services/role-service', () => ({
  roleService: {
    list: vi.fn(),
  },
}));

// ── Test wrapper with QueryClient + Router ──

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

interface RenderOptions {
  queryClient?: QueryClient;
}

function renderWithProviders(ui: React.ReactElement, opts?: RenderOptions) {
  const queryClient = opts?.queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Mock Data ──────────────────────────────

const mockOverview: PlatformOverview = {
  organizations: { total: 12, active: 10, inactive: 1, pending: 1, byType: { TVET_SCHOOL: 5, COMPANY: 3, UNIVERSITY: 4 }, newThisMonth: 2 },
  users: { total: 45, platformOwners: 1, organizationOwners: 5, admins: 8, designers: 6, assessors: 10, reviewers: 3, candidates: 8, individualCandidates: 4, activeUsers: 40 },
  candidates: { total: 28, active: 25 },
  exams: { total: 8, draft: 2, published: 4, inProgress: 1, completed: 1, archived: 0 },
  subscriptions: { totalActiveSubscriptions: 5, planDistribution: [{ planName: 'Starter', planType: 'ORGANIZATION', count: 3 }, { planName: 'Professional', planType: 'ORGANIZATION', count: 2 }] },
  recentActivity: [
    { id: '1', action: 'SWD Final Exam published', entity: 'exam', entityId: '1', severity: 'INFO', timestamp: new Date(Date.now() - 120000).toISOString(), userName: 'Platform Owner' },
    { id: '2', action: 'New organization registered', entity: 'organization', entityId: '2', severity: 'INFO', timestamp: new Date(Date.now() - 900000).toISOString(), userName: null },
  ],
  monthlyRegistrations: [
    { month: 'Feb', year: 2026, organizations: 2, users: 5, candidates: 3 },
    { month: 'Mar', year: 2026, organizations: 1, users: 8, candidates: 4 },
    { month: 'Apr', year: 2026, organizations: 3, users: 6, candidates: 7 },
    { month: 'May', year: 2026, organizations: 2, users: 10, candidates: 5 },
    { month: 'Jun', year: 2026, organizations: 4, users: 12, candidates: 6 },
    { month: 'Jul', year: 2026, organizations: 2, users: 4, candidates: 3 },
  ],
  platformHealth: { uptime: 86400, version: '1.0.0', totalOrganizations: 12, totalUsers: 45, totalCandidates: 28, totalExams: 8, activeOrganizations: 10, activeUsers: 40, publishedExams: 4, completedAssessments: 15 },
  seatUsage: {
    totalSeats: 600,
    seatsUsed: 120,
    nearCapacity: [
      { id: 'org-1', name: 'Alpha Coding Institute', used: 90, max: 100 },
      { id: 'org-2', name: 'Kigali Tech Institute', used: 80, max: 100 },
    ],
    topByUsage: [
      { id: 'org-1', name: 'Alpha Coding Institute', used: 90, max: 100 },
      { id: 'org-3', name: 'Rwanda Coding School', used: 25, max: 500 },
    ],
  },
  seatUsageTrend: [
    { month: 'Feb', year: 2026, orgsAdded: 2, seatsConsumed: 3 },
    { month: 'Mar', year: 2026, orgsAdded: 1, seatsConsumed: 4 },
    { month: 'Apr', year: 2026, orgsAdded: 3, seatsConsumed: 7 },
    { month: 'May', year: 2026, orgsAdded: 2, seatsConsumed: 5 },
    { month: 'Jun', year: 2026, orgsAdded: 4, seatsConsumed: 6 },
    { month: 'Jul', year: 2026, orgsAdded: 2, seatsConsumed: 3 },
  ],
};

const mockOrgData: OrgDashboardData = {
  orgName: 'CodeBridge Academy',
  orgType: 'TVET_SCHOOL',
  totalUsers: 15,
  totalCandidates: 80,
  totalExams: 4,
  activeExams: 2,
  completedAssessments: 120,
  passRate: 72.5,
  averageScore: 68,
  totalCertificates: 25,
  subscriptionStatus: 'ACTIVE',
  maxCandidates: 100,
  seatUsageTrend: [
    { month: 'Feb', year: 2026, seatsConsumed: 3 },
    { month: 'Mar', year: 2026, seatsConsumed: 4 },
    { month: 'Apr', year: 2026, seatsConsumed: 7 },
    { month: 'May', year: 2026, seatsConsumed: 5 },
    { month: 'Jun', year: 2026, seatsConsumed: 6 },
    { month: 'Jul', year: 2026, seatsConsumed: 3 },
  ],
  usage: { planName: 'Professional', billingCycle: 'MONTHLY', maxAssessments: 5000, totalAssessmentsUsed: 320 },
};

const mockAssessorData: RoleDashboardData = {
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
};

const mockRoles = [
  { id: '1', name: 'PLATFORM_OWNER', description: 'Full system access', permissions: [] },
  { id: '2', name: 'ORGANIZATION_OWNER', description: 'Organization-level management', permissions: [] },
  { id: '3', name: 'ADMIN', description: 'Day-to-day operations', permissions: [] },
  { id: '4', name: 'DESIGNER', description: 'Exam creation', permissions: [] },
  { id: '5', name: 'ASSESSOR', description: 'Submission review', permissions: [] },
  { id: '6', name: 'ORGANIZATION_REVIEWER', description: 'Candidate review', permissions: [] },
  { id: '7', name: 'CANDIDATE', description: 'Takes exams', permissions: [] },
  { id: '8', name: 'INDIVIDUAL_CANDIDATE', description: 'Self-registered', permissions: [] },
];

// ── Test Suite ─────────────────────────────────

describe('DashboardPage — role-adaptive rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Role list is always resolved (used by DynamicRoleDistribution)
    vi.mocked(roleService.list).mockResolvedValue(mockRoles as any);
    // jsdom doesn't implement scrollIntoView — stub it so month drill-down
    // clicks don't crash in any test that renders the dashboard.
    Element.prototype.scrollIntoView = vi.fn();
  });

  // ══════════════════════════════════════════════
  //  1. PLATFORM_OWNER — full platform overview
  // ══════════════════════════════════════════════
  describe('PLATFORM_OWNER role', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: {
          id: '1', email: 'admin@codebridge.academy',
          firstName: 'Platform', lastName: 'Owner',
          role: 'PLATFORM_OWNER', isActive: true, mfaEnabled: false,
        },
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      });
      vi.mocked(dashboardService.getPlatformOverview).mockResolvedValue(mockOverview);
    });

    it('renders Platform Dashboard heading', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      });
    });

    it('renders all 6 platform-level stat cards', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        // 'Organizations' appears in stat card AND chart legend — use getAllByText
        expect(screen.getAllByText('Organizations').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Total Users').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Candidates').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Exams').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Assessments Done').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Active Subscriptions').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders stat values: 12 Orgs, 45 Users, 28 Candidates', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('28')).toBeInTheDocument();
      });
    });

    it('renders Monthly Registrations chart card', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Monthly Registrations')).toBeInTheDocument();
      });
    });

    it('renders Organization Types donut chart', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Organization Types')).toBeInTheDocument();
      });
    });

    it('renders Recent Activity section with activity items', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('SWD Final Exam published')).toBeInTheDocument();
        expect(screen.getByText('New organization registered')).toBeInTheDocument();
      });
    });

    it('renders Quick Actions panel', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Manage Organizations')).toBeInTheDocument();
        expect(screen.getByText('Manage Plans')).toBeInTheDocument();
        expect(screen.getByText('Audit Logs')).toBeInTheDocument();
        expect(screen.getByText('System Online')).toBeInTheDocument();
      });
    });

    it('renders User Role Distribution section with dynamic role labels', async () => {
      renderWithProviders(<DashboardPage />);
      // Extended timeout: the roles query resolves through React Query and this
      // assertion races other tests when the full suite runs in parallel
      // workers — give it headroom so it doesn't flake under load.
      // Labels come from the mocked roleService descriptions.
      await screen.findByText('Full system access', {}, { timeout: 5000 });
      expect(screen.getByText('Organization-level management')).toBeInTheDocument();
    });

    it('renders the org seats summary strip (total / used / near-capacity)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Total Seats')).toBeInTheDocument();
        expect(screen.getByText('600')).toBeInTheDocument();
        expect(screen.getByText('Seats Used')).toBeInTheDocument();
        expect(screen.getByText('Orgs Near Capacity')).toBeInTheDocument();
        // Near-capacity orgs come from the overview's seatUsage block (the org
        // also appears in the top-orgs row, so use the *All* variant)
        expect(screen.getAllByText('Alpha Coding Institute').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('90/100').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the Top Orgs by Seat Usage row', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Top Orgs by Seat Usage')).toBeInTheDocument();
        // Only topByUsage orgs appear there (CodeBridge + Rwanda Coding School)
        expect(screen.getByText('Rwanda Coding School')).toBeInTheDocument();
      });
    });

    it('renders the Seat Usage Trend chart (orgs added vs seats consumed)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
        expect(screen.getByText('Orgs added')).toBeInTheDocument();
        expect(screen.getByText('Seats consumed')).toBeInTheDocument();
        // Month labels come from the fixture's seatUsageTrend
        expect(screen.getAllByText('Feb').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('toggles the Seat Usage Trend to cumulative seats-in-use (running totals)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
      });

      // Monthly view shows per-month deltas (Feb + Jul both had 3 seats consumed)
      expect(screen.getAllByTitle('Seats consumed: 3').length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByRole('button', { name: 'Cumulative' }));

      await waitFor(() => {
        // Legend + labels swap to cumulative semantics
        expect(screen.getByText('Cumulative orgs')).toBeInTheDocument();
        expect(screen.getByText('Seats in use')).toBeInTheDocument();
        // Running totals: seats 3+4+7+5+6+3 = 28; orgs 2+1+3+2+4+2 = 14
        expect(screen.getByTitle('Seats in use: 28')).toBeInTheDocument();
        expect(screen.getByTitle('Cumulative orgs: 14')).toBeInTheDocument();
      });

      // Toggle back to Monthly restores per-month deltas
      fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
      await waitFor(() => {
        expect(screen.getByText('Seats consumed')).toBeInTheDocument();
        expect(screen.getAllByTitle('Seats consumed: 3').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('jumps to the Monthly Registrations breakdown when a trend month is clicked', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
      });

      // Month labels on the trend chart are clickable buttons
      fireEvent.click(screen.getByRole('button', { name: 'Show Feb monthly registrations breakdown' }));

      await waitFor(() => {
        // The month's breakdown strip appears with the fixture numbers
        // (Feb: 2 orgs, 5 users, 3 candidates)
        const strip = screen.getByText('Registrations').closest('.bg-surface-secondary') as HTMLElement;
        expect(strip).toBeInTheDocument();
        expect(within(strip).getByText('Orgs')).toBeInTheDocument();
        expect(within(strip).getByText('2')).toBeInTheDocument();
        expect(within(strip).getByText('5')).toBeInTheDocument();
        expect(within(strip).getByText('3')).toBeInTheDocument();
        // Scroll was requested on the Monthly Registrations card
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      });
    });

    it('does not dim the Monthly Registrations chart before a month is selected', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Monthly Registrations')).toBeInTheDocument();
      });

      // No highlighted month yet — no column carries the opacity-30 dim
      expect(document.querySelector('.opacity-30')).toBeNull();
    });

    it('clears the monthly breakdown highlight when another month is selected', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Show Mar monthly registrations breakdown' }));
      await waitFor(() => {
        expect(screen.getByText('Mar 2026 breakdown')).toBeInTheDocument();
        expect(screen.queryByText('Feb 2026 breakdown')).not.toBeInTheDocument();
      });
    });

    it('hides the seats strip when the overview has no seatUsage data', async () => {
      vi.mocked(dashboardService.getPlatformOverview).mockResolvedValue({
        ...mockOverview,
        seatUsage: undefined as any,
      });
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Platform Dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByText('Total Seats')).not.toBeInTheDocument();
      expect(screen.queryByText('Top Orgs by Seat Usage')).not.toBeInTheDocument();
    });

    it('does NOT render OrgDashboard content', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText('CodeBridge Academy')).not.toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════
  //  2. ORGANIZATION_OWNER — org-specific dashboard
  // ══════════════════════════════════════════════
  describe('ORGANIZATION_OWNER role', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: {
          id: '2', email: 'admin@cbacademy.com',
          firstName: 'Org', lastName: 'Admin',
          role: 'ORGANIZATION_OWNER', isActive: true, mfaEnabled: false,
          organizationId: 'org-1',
        },
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      });
      vi.mocked(dashboardService.getOrganizationDashboard).mockResolvedValue(mockOrgData);
    });

    it('renders organization dashboard with org name', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('CodeBridge Academy')).toBeInTheDocument();
      });
    });

    it('renders organization stat cards (5 cards)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getAllByText('Total Users').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Candidates').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Total Exams').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Assessments Done').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Certificates').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders Performance section with average score', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('68%')).toBeInTheDocument(); // averageScore
        expect(screen.getByText('Average Score')).toBeInTheDocument();
      });
    });

    it('renders Subscription card with plan details', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Subscription')).toBeInTheDocument();
        expect(screen.getByText('Professional')).toBeInTheDocument(); // planName
      });
    });

    it('renders the candidate seats meter (used vs plan max)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Candidate Seats')).toBeInTheDocument();
        expect(screen.getByText('80 / 100')).toBeInTheDocument();
        // Not at capacity: no upgrade prompt
        expect(screen.queryByText('Seat limit reached')).not.toBeInTheDocument();
      });
    });

    it('shows the seat quota chip in the header next to the subscription badge', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument(); // subscription badge
        expect(screen.getByText('80/100 seats')).toBeInTheDocument(); // header chip
      });
    });

    it('shows the seat quota chip with the used count when at capacity', async () => {
      vi.mocked(dashboardService.getOrganizationDashboard).mockResolvedValue({
        ...mockOrgData,
        totalCandidates: 100,
      });
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('100/100 seats')).toBeInTheDocument();
        expect(screen.getByText('Seat limit reached')).toBeInTheDocument();
      });
    });

    it('shows an Unlimited seats chip for uncapped plans', async () => {
      vi.mocked(dashboardService.getOrganizationDashboard).mockResolvedValue({
        ...mockOrgData,
        maxCandidates: 999999,
      });
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Unlimited seats')).toBeInTheDocument();
      });
    });

    it('shows the seat-limit warning when the org is at capacity', async () => {
      vi.mocked(dashboardService.getOrganizationDashboard).mockResolvedValue({
        ...mockOrgData,
        totalCandidates: 100,
      });
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Seat limit reached')).toBeInTheDocument();
        expect(screen.getByText('Upgrade plan')).toBeInTheDocument();
      });
    });

    it('renders Unlimited seats for plans without a candidate cap', async () => {
      vi.mocked(dashboardService.getOrganizationDashboard).mockResolvedValue({
        ...mockOrgData,
        maxCandidates: 999999,
      });
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('80 / Unlimited')).toBeInTheDocument();
        expect(screen.queryByText('Seat limit reached')).not.toBeInTheDocument();
      });
    });

    it('renders the org seat usage trend (this org candidates only)', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
        expect(screen.getByText('Seats consumed')).toBeInTheDocument();
        expect(screen.getAllByText('Feb').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('toggles the org seat usage trend to cumulative seats in use', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Seat Usage Trend')).toBeInTheDocument();
      });

      // Monthly: Feb + Jul both had 3 seats consumed
      expect(screen.getAllByTitle('Seats consumed: 3').length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByRole('button', { name: 'Cumulative' }));

      await waitFor(() => {
        expect(screen.getByText('Seats in use')).toBeInTheDocument();
        // Running total of the fixture seats: 3+4+7+5+6+3 = 28
        expect(screen.getByTitle('Seats in use: 28')).toBeInTheDocument();
      });
    });

    it('renders Org Quick Actions', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Create Exam')).toBeInTheDocument();
        expect(screen.getByText('Manage Candidates')).toBeInTheDocument();
        expect(screen.getByText('Org Settings')).toBeInTheDocument();
      });
    });

    it('does NOT render platform-only content', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText('Platform Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Organizations')).not.toBeInTheDocument();
        expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════
  //  3. ASSESSOR — role-specific dashboard
  // ══════════════════════════════════════════════
  describe('ASSESSOR role', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: {
          id: '3', email: 'assessor@cbacademy.com',
          firstName: 'Senior', lastName: 'Assessor',
          role: 'ASSESSOR', isActive: true, mfaEnabled: false,
          organizationId: 'org-1',
        },
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      });
      vi.mocked(dashboardService.getRoleDashboard).mockResolvedValue(mockAssessorData);
    });

    it('renders the assessor welcome message', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(
          screen.getByText('Review submissions, evaluate candidates, and finalize scores'),
        ).toBeInTheDocument();
      });
    });

    it('renders assessor stat cards: Assigned, Pending Review, Completed', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('Assigned')).toBeInTheDocument();
        expect(screen.getByText('Pending Review')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('renders assessor stat values: 3 Assigned, 8 Pending, 15 Completed', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('renders assessor Quick Actions', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('View Pending Reviews')).toBeInTheDocument();
        expect(screen.getByText('View Assessments')).toBeInTheDocument();
      });
    });

    it('does NOT render platform or org content', async () => {
      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByText('Platform Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('CodeBridge Academy')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Organizations')).not.toBeInTheDocument();
        expect(screen.queryByText('Create Exam')).not.toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════════
  //  Shared behavior across all roles
  // ══════════════════════════════════════════════

  describe('shared behavior', () => {
    it('shows loading skeleton initially for PLATFORM_OWNER', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'admin@codebridge.academy', firstName: 'Platform', lastName: 'Owner', role: 'PLATFORM_OWNER', isActive: true, mfaEnabled: false },
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      });
      vi.mocked(dashboardService.getPlatformOverview).mockReturnValue(new Promise(() => {}));

      renderWithProviders(<DashboardPage />);
      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });

    it('shows error state with retry button when API fails', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'admin@codebridge.academy', firstName: 'Platform', lastName: 'Owner', role: 'PLATFORM_OWNER', isActive: true, mfaEnabled: false },
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
      });
      vi.mocked(dashboardService.getPlatformOverview).mockRejectedValue(new Error('API Error'));

      renderWithProviders(<DashboardPage />);
      // waitFor with extended timeout because the hook has retry: 2
      await waitFor(() => {
        expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      }, { timeout: 15000 });
    }, 20000);
  });
});
