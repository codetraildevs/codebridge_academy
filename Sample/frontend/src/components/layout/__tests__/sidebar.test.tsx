import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../sidebar';
import { SidebarProvider } from '@components/ui/sidebar';
import { useAuthStore, type User } from '@stores/auth-store';
import { permissionService } from '@services/permission-service';
import { roleService, type Role } from '@services/role-service';
import { notificationsApi } from '@services/notifications-service';
import type { Permission } from '../../../types/permissions';

// ── Mocks ──────────────────────────────────
vi.mock('@services/permission-service', () => ({
  permissionService: { getMyPermissions: vi.fn() },
}));

vi.mock('@services/role-service', () => ({
  roleService: { list: vi.fn() },
}));

vi.mock('@services/notifications-service', () => ({
  notificationsApi: {
    getInbox: vi.fn(),
    list: vi.fn(),
    stats: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    compose: vi.fn(),
  },
}));

const mockRoles = [
  { id: '1', name: 'PLATFORM_OWNER', description: 'Full platform access', permissions: [] },
  { id: '2', name: 'ORGANIZATION_OWNER', description: 'Organization-level management', permissions: [] },
  { id: '3', name: 'ADMIN', description: 'Day-to-day operations', permissions: [] },
  { id: '4', name: 'DESIGNER', description: 'Assessment creation', permissions: [] },
  { id: '5', name: 'ASSESSOR', description: 'Submission review', permissions: [] },
  { id: '6', name: 'ORGANIZATION_REVIEWER', description: 'Candidate review', permissions: [] },
  { id: '7', name: 'CANDIDATE', description: 'Takes assessments', permissions: [] },
  { id: '8', name: 'INDIVIDUAL_CANDIDATE', description: 'Self-registered candidate', permissions: [] },
];

const NAMES = [
  'dashboard:view', 'organizations:view', 'organizations:create', 'organizations:manage',
  'users:view', 'users:manage',
  'exams:view', 'exams:create', 'exams:manage',
  'assessments:view', 'assessments:assess',
  'candidates:view', 'candidates:manage',
  'interviews:view', 'interviews:conduct',
  'reports:view', 'certificates:view', 'certificates:issue',
  'settings:view', 'plans:manage', 'ai:configure', 'audit:view',
];

function permissionsFor(...names: string[]): Permission[] {
  return names.map((name) => ({ id: name, name, description: null, module: name.split(':')[0]! }));
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderSidebar(initialPath = '/dashboard') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setUser(role: string, extra: Partial<User> = {}) {
  useAuthStore.setState({
    user: {
      id: '1',
      email: 'user@qualexas.com',
      firstName: 'Test',
      lastName: 'User',
      role,
      isActive: true,
      mfaEnabled: false,
      ...extra,
    },
    accessToken: 't',
    refreshToken: 'r',
    isAuthenticated: true,
  });
}

/** Expands a group by clicking its header button. */
async function openGroup(label: string) {
  const header = screen.getByRole('button', { name: new RegExp(label, 'i') });
  fireEvent.click(header);
}

describe('Sidebar — config-driven navigation (fix_sidebar.md structure)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roleService.list).mockResolvedValue(mockRoles as unknown as Role[]);
    vi.mocked(notificationsApi.getInbox).mockResolvedValue({ items: [], unread: 0 });
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  });

  // ══════════════════════════════════════════
  //  PLATFORM_OWNER — full platform access
  // ══════════════════════════════════════════
  describe('PLATFORM_OWNER role', () => {
    beforeEach(() => {
      setUser('PLATFORM_OWNER');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(permissionsFor(...NAMES));
    });

    it('shows Organization Management (Organizations, Organization Users)', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Organization Management')).toBeInTheDocument());

      await openGroup('Organization Management');
      expect(screen.getByRole('link', { name: 'Organizations' })).toHaveAttribute('href', '/organizations');
      expect(screen.getByRole('link', { name: 'Organization Users' })).toHaveAttribute('href', '/users');
    });

    it('shows People with Candidates, Assessors, Users & Roles', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('People')).toBeInTheDocument());

      await openGroup('People');
      expect(screen.getByRole('link', { name: 'Candidates' })).toHaveAttribute('href', '/candidates');
      expect(screen.getByRole('link', { name: 'Assessors' })).toHaveAttribute('href', '/assessors');
      expect(screen.getByRole('link', { name: 'Users & Roles' })).toHaveAttribute('href', '/users');
    });

    it('shows Assessments with all spec items incl. Templates', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Assessments')).toBeInTheDocument());

      await openGroup('Assessments');
      expect(screen.getByRole('link', { name: 'All Assessments' })).toHaveAttribute('href', '/assessments');
      expect(screen.getByRole('link', { name: 'Create Assessment' })).toHaveAttribute('href', '/assessment-builder/new');
      expect(screen.getByRole('link', { name: 'Import Assessment' })).toHaveAttribute('href', '/assessment-builder/new?mode=import');
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).toHaveAttribute('href', '/assessment-builder');
      expect(screen.getByRole('link', { name: 'Assessment Templates' })).toHaveAttribute('href', '/assessment-templates');
      expect(screen.getByRole('link', { name: 'Assessment Sessions' })).toHaveAttribute('href', '/exams');
      // Draft/Published status tabs are designer-only per fix_sidebar.md
      expect(screen.queryByRole('link', { name: 'Draft Assessments' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Published Assessments' })).not.toBeInTheDocument();
    });

    it('shows Evaluation with all seven spec items', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Evaluation')).toBeInTheDocument());

      await openGroup('Evaluation');
      expect(screen.getByRole('link', { name: 'Candidate Submissions' })).toHaveAttribute('href', '/assessor-review');
      expect(screen.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', '/evidence');
      expect(screen.getByRole('link', { name: 'Assessment Checklist' })).toHaveAttribute('href', '/assessment-checklist');
      expect(screen.getByRole('link', { name: 'AI Evaluation' })).toHaveAttribute('href', '/ai-evaluation');
      expect(screen.getByRole('link', { name: 'Manual Evaluation' })).toHaveAttribute('href', '/manual-evaluation');
      expect(screen.getByRole('link', { name: 'Oral Defense' })).toHaveAttribute('href', '/oral-defense');
      expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
    });

    it('shows Workspace, AI & Automation, Reports & Analytics, Subscriptions, Administration', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Workspace')).toBeInTheDocument());

      await openGroup('Workspace');
      expect(screen.getByRole('link', { name: 'Workspace Modules' })).toHaveAttribute('href', '/workspace');
      expect(screen.getByRole('link', { name: 'Workspace Configuration' })).toHaveAttribute('href', '/workspace?view=configuration');

      await openGroup('AI & Automation');
      expect(screen.getByRole('link', { name: 'AI Configuration' })).toHaveAttribute('href', '/ai-config');
      expect(screen.getByRole('link', { name: 'AI Evaluation Rules' })).toHaveAttribute('href', '/ai-rules');
      expect(screen.getByRole('link', { name: 'AI Question Generation' })).toHaveAttribute('href', '/ai-generation');
      // The /usage page is subscription/billing usage — it belongs under
      // Subscriptions ("Usage"), not here, so "AI Usage" must not exist.
      expect(screen.queryByRole('link', { name: 'AI Usage' })).not.toBeInTheDocument();

      await openGroup('Reports & Analytics');
      expect(screen.getByRole('link', { name: 'Assessment Reports' })).toHaveAttribute('href', '/reports');
      expect(screen.getByRole('link', { name: 'Candidate Reports' })).toHaveAttribute('href', '/reports?view=candidates');
      expect(screen.getByRole('link', { name: 'Organization Reports' })).toHaveAttribute('href', '/reports?view=organizations');
      expect(screen.getByRole('link', { name: 'Assessor Reports' })).toHaveAttribute('href', '/reports?view=assessors');
      expect(screen.getByRole('link', { name: 'Performance Analytics' })).toHaveAttribute('href', '/reports?view=performance');

      await openGroup('Subscriptions');
      expect(screen.getByRole('link', { name: 'Subscription Plans' })).toHaveAttribute('href', '/settings/plans');
      expect(screen.getByRole('link', { name: 'Organization Subscriptions' })).toHaveAttribute('href', '/subscriptions');
      expect(screen.getByRole('link', { name: 'User Subscriptions' })).toHaveAttribute('href', '/subscriptions/users');
      expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/payments');
      expect(screen.getByRole('link', { name: 'Payment History' })).toHaveAttribute('href', '/payments/history');
      expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '/usage');

      await openGroup('Administration');
      expect(screen.getByRole('link', { name: 'Audit Logs' })).toHaveAttribute('href', '/audit-logs');
      expect(screen.getByRole('link', { name: 'System Configuration' })).toHaveAttribute('href', '/system-config');
      expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security');
      expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications');
    });

    it('shows Account with My Profile and Account Settings (no Security/Notifications duplicates)', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Account')).toBeInTheDocument());

      await openGroup('Account');
      expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/account');
      // Personal security/notification settings live under the /settings tab bar;
      // they must not be duplicated here (Administration owns those labels).
      expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    });

    it('highlights Create Assessment — not the Builder prefix — on the new route', async () => {
      renderSidebar('/assessment-builder/new');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Create Assessment' })).toHaveAttribute('aria-current', 'page');
      });
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).not.toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Import Assessment' })).not.toHaveAttribute('aria-current', 'page');
    });

    it('highlights Import Assessment — and not Create — on the ?mode=import deep link', async () => {
      renderSidebar('/assessment-builder/new?mode=import');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Import Assessment' })).toHaveAttribute('aria-current', 'page');
      });
      expect(screen.getByRole('link', { name: 'Create Assessment' })).not.toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).not.toHaveAttribute('aria-current', 'page');
    });

    it('does NOT show candidate-only groups', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument());
      expect(screen.queryByText('My Work')).not.toBeInTheDocument();
      expect(screen.queryByText('Oral Defense')).not.toBeInTheDocument();
      expect(screen.queryByText('Results')).not.toBeInTheDocument();
    });

    it('renders live badge counts on nav items', async () => {
      vi.mocked(notificationsApi.getInbox).mockResolvedValue({
        unread: 5,
        items: [
          {
            id: 'n1',
            kind: 'review',
            title: 'SQL Database Design',
            description: 'A new submission awaits review.',
            route: '/assessor-review',
            isRead: false,
            timestamp: '2026-08-15T09:00:00.000Z',
          },
        ],
      });
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Evaluation')).toBeInTheDocument());

      // Evaluation is an expandable group — reveal its items to read the badge.
      await openGroup('Evaluation');
      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /Candidate Submissions, 1 awaiting attention/ }),
        ).toBeInTheDocument();
      });
    });

    it('auto-expands the group of the active route', async () => {
      renderSidebar('/assessment-builder');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Assessment Builder' })).toBeInTheDocument();
      });
    });
  });

  // ══════════════════════════════════════════
  //  CANDIDATE — simple focused navigation
  // ══════════════════════════════════════════
  describe('CANDIDATE role', () => {
    beforeEach(() => {
      setUser('CANDIDATE');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
        permissionsFor('dashboard:view', 'exams:view', 'assessments:view'),
      );
    });

    it('shows My Assessments with the four portal tabs', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Assessments')).toBeInTheDocument());

      await openGroup('My Assessments');
      expect(screen.getByRole('link', { name: 'Available Assessments' })).toHaveAttribute('href', '/candidate-portal?tab=available');
      expect(screen.getByRole('link', { name: 'My Assessments' })).toHaveAttribute('href', '/candidate-portal');
      expect(screen.getByRole('link', { name: 'Active Assessments' })).toHaveAttribute('href', '/candidate-portal?tab=active');
      expect(screen.getByRole('link', { name: 'Assessment History' })).toHaveAttribute('href', '/candidate-portal?tab=history');
    });

    it('shows My Work, Oral Defense, Results and Account', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Work')).toBeInTheDocument());

      await openGroup('My Work');
      expect(screen.getByRole('link', { name: 'My Workspace' })).toHaveAttribute('href', '/my-workspace');
      expect(screen.getByRole('link', { name: 'My Tasks' })).toHaveAttribute('href', '/my-tasks');
      expect(screen.getByRole('link', { name: 'My Submissions' })).toHaveAttribute('href', '/candidate-portal/submissions');
      expect(screen.getByRole('link', { name: 'My Evidence' })).toHaveAttribute('href', '/my-evidence');

      await openGroup('Oral Defense');
      expect(screen.getByRole('link', { name: 'Oral Defense' })).toHaveAttribute('href', '/candidate-oral-defense');
      expect(screen.getByRole('link', { name: 'Defense History' })).toHaveAttribute('href', '/defense-history');

      await openGroup('Results');
      expect(screen.getByRole('link', { name: 'My Results' })).toHaveAttribute('href', '/candidate-portal/submissions?status=completed');
      expect(screen.getByRole('link', { name: 'Certificates' })).toHaveAttribute('href', '/certificates');

      await openGroup('Account');
      expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/account');
      expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    });

    it('highlights the exact portal tab deep-link, not sibling tabs', async () => {
      renderSidebar('/candidate-portal?tab=available');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Available Assessments' })).toHaveAttribute('aria-current', 'page');
      });
      expect(screen.getByRole('link', { name: 'My Assessments' })).not.toHaveAttribute('aria-current', 'page');
    });

    it('hides admin/organization/designer navigation', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument());

      expect(screen.queryByText('People')).not.toBeInTheDocument();
      expect(screen.queryByText('Organization Management')).not.toBeInTheDocument();
      expect(screen.queryByText('My Organization')).not.toBeInTheDocument();
      expect(screen.queryByText('AI & Automation')).not.toBeInTheDocument();
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      expect(screen.queryByText('All Assessments')).not.toBeInTheDocument();
      expect(screen.queryByText('Assessment Builder')).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════
  //  ORGANIZATION_OWNER — org management
  // ══════════════════════════════════════════
  describe('ORGANIZATION_OWNER role', () => {
    beforeEach(() => {
      setUser('ORGANIZATION_OWNER');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
        permissionsFor(
          'dashboard:view', 'exams:view', 'exams:create', 'exams:manage',
          'assessments:view', 'assessments:assess',
          'candidates:view', 'candidates:manage',
          'interviews:view', 'interviews:conduct',
          'reports:view', 'certificates:view', 'certificates:issue', 'settings:view',
        ),
      );
    });

    it('shows My Organization with Overview, Users, Settings', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Organization')).toBeInTheDocument());

      await openGroup('My Organization');
      expect(screen.getByRole('link', { name: 'Organization Overview' })).toHaveAttribute('href', '/organization-overview');
      expect(screen.getByRole('link', { name: 'Organization Users' })).toHaveAttribute('href', '/users');
      expect(screen.getByRole('link', { name: 'Organization Settings' })).toHaveAttribute('href', '/settings');
    });

    it('shows People with Candidates, Assessors, and Users & Roles', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('People')).toBeInTheDocument());

      await openGroup('People');
      expect(screen.getByRole('link', { name: 'Candidates' })).toHaveAttribute('href', '/candidates');
      expect(screen.getByRole('link', { name: 'Assessors' })).toHaveAttribute('href', '/assessors');
      // Org managers manage users inside their own org — no org picker, no
      // platform-owner role (enforced by the API).
      expect(screen.getByRole('link', { name: 'Users & Roles' })).toHaveAttribute('href', '/users');
    });

    it('shows Assessments with all spec items incl. Templates, no Draft/Published', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Assessments')).toBeInTheDocument());

      await openGroup('Assessments');
      expect(screen.getByRole('link', { name: 'All Assessments' })).toHaveAttribute('href', '/assessments');
      expect(screen.getByRole('link', { name: 'Create Assessment' })).toHaveAttribute('href', '/assessment-builder/new');
      expect(screen.getByRole('link', { name: 'Import Assessment' })).toHaveAttribute('href', '/assessment-builder/new?mode=import');
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).toHaveAttribute('href', '/assessment-builder');
      expect(screen.getByRole('link', { name: 'Assessment Sessions' })).toHaveAttribute('href', '/exams');
      expect(screen.getByRole('link', { name: 'Assessment Templates' })).toHaveAttribute('href', '/assessment-templates');
      expect(screen.queryByRole('link', { name: 'Draft Assessments' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Published Assessments' })).not.toBeInTheDocument();
    });

    it('shows Evaluation without AI/Manual Evaluation (PO/assessor only)', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Evaluation')).toBeInTheDocument());

      await openGroup('Evaluation');
      expect(screen.getByRole('link', { name: 'Candidate Submissions' })).toHaveAttribute('href', '/assessor-review');
      expect(screen.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', '/evidence');
      expect(screen.getByRole('link', { name: 'Assessment Checklist' })).toHaveAttribute('href', '/assessment-checklist');
      expect(screen.getByRole('link', { name: 'Oral Defense' })).toHaveAttribute('href', '/oral-defense');
      expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
      expect(screen.queryByText('AI Evaluation')).not.toBeInTheDocument();
      expect(screen.queryByText('Manual Evaluation')).not.toBeInTheDocument();
    });

    it('shows Reports, Subscription and Account groups', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());

      await openGroup('Reports');
      expect(screen.getByRole('link', { name: 'Assessment Reports' })).toHaveAttribute('href', '/reports');
      expect(screen.getByRole('link', { name: 'Candidate Reports' })).toHaveAttribute('href', '/reports?view=candidates');
      expect(screen.getByRole('link', { name: 'Performance Analytics' })).toHaveAttribute('href', '/reports?view=performance');

      await openGroup('Subscription');
      expect(screen.getByRole('link', { name: 'My Subscription' })).toHaveAttribute('href', '/settings/plans');
      expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/billing');
      expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '/usage');

      await openGroup('Account');
      expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/account');
      expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    });

    it('hides platform-only items (Organization Management, AI, Administration, Workspace)', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Organization')).toBeInTheDocument());

      expect(screen.queryByText('Organization Management')).not.toBeInTheDocument();
      expect(screen.queryByText('AI & Automation')).not.toBeInTheDocument();
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
    });

    it('highlights the exact status tab deep-link, not the plain sibling', async () => {
      renderSidebar('/assessments?status=draft');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'All Assessments' })).toBeInTheDocument();
      });
      // Org admins have no Draft/Published tab items per fix_sidebar.md — the
      // deep link still works via All Assessments' prefix match.
      expect(screen.getByRole('link', { name: 'All Assessments' })).toHaveAttribute('aria-current', 'page');
    });
  });

  // ══════════════════════════════════════════
  //  ADMIN — day-to-day org operations
  //  (the codebase's other org-admin role)
  // ══════════════════════════════════════════
  describe('ADMIN role (org admin variant)', () => {
    beforeEach(() => {
      setUser('ADMIN');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
        permissionsFor(
          'dashboard:view', 'exams:view', 'exams:create', 'exams:manage',
          'assessments:view', 'assessments:assess',
          'candidates:view', 'candidates:manage',
          'interviews:view', 'interviews:conduct',
          'reports:view', 'certificates:view', 'certificates:issue', 'settings:view',
        ),
      );
    });

    it('gets the same org-admin navigation as ORGANIZATION_OWNER', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Organization')).toBeInTheDocument());

      await openGroup('My Organization');
      expect(screen.getByRole('link', { name: 'Organization Users' })).toHaveAttribute('href', '/users');
      expect(screen.getByRole('link', { name: 'Organization Settings' })).toHaveAttribute('href', '/settings');

      await openGroup('Assessments');
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).toHaveAttribute('href', '/assessment-builder');

      await openGroup('People');
      expect(screen.getByRole('link', { name: 'Candidates' })).toHaveAttribute('href', '/candidates');
      expect(screen.getByRole('link', { name: 'Assessors' })).toHaveAttribute('href', '/assessors');
    });

    it('hides platform-only and candidate-only groups', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Organization')).toBeInTheDocument());

      expect(screen.queryByText('Organization Management')).not.toBeInTheDocument();
      expect(screen.queryByText('AI & Automation')).not.toBeInTheDocument();
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('My Work')).not.toBeInTheDocument();
      expect(screen.queryByText('Oral Defense')).not.toBeInTheDocument();
      expect(screen.queryByText('Results')).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════
  //  ASSESSOR — candidate review focus
  // ══════════════════════════════════════════
  describe('ASSESSOR role', () => {
    beforeEach(() => {
      setUser('ASSESSOR');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
        permissionsFor(
          'dashboard:view', 'assessments:view', 'assessments:assess',
          'candidates:view', 'interviews:view', 'interviews:conduct',
        ),
      );
    });

    it('shows My Assessments (Assigned, Sessions, Candidates) and no People group', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Assessments')).toBeInTheDocument());

      await openGroup('My Assessments');
      expect(screen.getByRole('link', { name: 'Assigned Assessments' })).toHaveAttribute('href', '/assessments?status=assigned');
      expect(screen.getByRole('link', { name: 'Assessment Sessions' })).toHaveAttribute('href', '/exams');
      expect(screen.getByRole('link', { name: 'Candidates' })).toHaveAttribute('href', '/candidates');

      expect(screen.queryByText('People')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Users & Roles' })).not.toBeInTheDocument();
    });

    it('shows Evaluation with all seven spec items', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Evaluation')).toBeInTheDocument());

      await openGroup('Evaluation');
      expect(screen.getByRole('link', { name: 'Candidate Submissions' })).toHaveAttribute('href', '/assessor-review');
      expect(screen.getByRole('link', { name: 'Evidence' })).toHaveAttribute('href', '/evidence');
      expect(screen.getByRole('link', { name: 'Assessment Checklist' })).toHaveAttribute('href', '/assessment-checklist');
      expect(screen.getByRole('link', { name: 'AI Evaluation' })).toHaveAttribute('href', '/ai-evaluation');
      expect(screen.getByRole('link', { name: 'Manual Evaluation' })).toHaveAttribute('href', '/manual-evaluation');
      expect(screen.getByRole('link', { name: 'Oral Defense' })).toHaveAttribute('href', '/oral-defense');
      expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
    });

    it('shows Reports with Assessment Reports and Candidate Results', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());

      await openGroup('Reports');
      expect(screen.getByRole('link', { name: 'Assessment Reports' })).toHaveAttribute('href', '/reports');
      expect(screen.getByRole('link', { name: 'Candidate Results' })).toHaveAttribute('href', '/candidate-results');

      await openGroup('Account');
      expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/account');
      expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    });

    it('hides builder, management, and platform groups', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('My Assessments')).toBeInTheDocument());

      expect(screen.queryByText('Assessment Builder')).not.toBeInTheDocument();
      expect(screen.queryByText('Assessment Templates')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Assessment')).not.toBeInTheDocument();
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      expect(screen.queryByText('AI & Automation')).not.toBeInTheDocument();
      expect(screen.queryByText('My Organization')).not.toBeInTheDocument();
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('Subscription')).not.toBeInTheDocument();
    });

    it('highlights Assigned Assessments on the /assessments?status=assigned deep link', async () => {
      renderSidebar('/assessments?status=assigned');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Assigned Assessments' })).toHaveAttribute('aria-current', 'page');
      });
      expect(screen.queryByRole('link', { name: 'All Assessments' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Draft Assessments' })).not.toBeInTheDocument();
    });
  });

  // ══════════════════════════════════════════
  //  DESIGNER — assessment creation focus
  // ══════════════════════════════════════════
  describe('DESIGNER role', () => {
    beforeEach(() => {
      setUser('DESIGNER');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
        permissionsFor('dashboard:view', 'exams:view', 'exams:create', 'assessments:view', 'candidates:view'),
      );
    });

    it('shows Assessments with the designer list incl. Draft/Published and Templates', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Assessments')).toBeInTheDocument());

      await openGroup('Assessments');
      expect(screen.getByRole('link', { name: 'My Assessments' })).toHaveAttribute('href', '/assessments');
      expect(screen.getByRole('link', { name: 'Create Assessment' })).toHaveAttribute('href', '/assessment-builder/new');
      expect(screen.getByRole('link', { name: 'Import Assessment' })).toHaveAttribute('href', '/assessment-builder/new?mode=import');
      expect(screen.getByRole('link', { name: 'Assessment Builder' })).toHaveAttribute('href', '/assessment-builder');
      expect(screen.getByRole('link', { name: 'Assessment Templates' })).toHaveAttribute('href', '/assessment-templates');
      expect(screen.getByRole('link', { name: 'Draft Assessments' })).toHaveAttribute('href', '/assessments?status=draft');
      expect(screen.getByRole('link', { name: 'Published Assessments' })).toHaveAttribute('href', '/assessments?status=published');

      expect(screen.queryByText('People')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
      expect(screen.queryByText('Evaluation')).not.toBeInTheDocument();
      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    });

    it('shows AI & Automation as a direct link to AI Generation; AI Configuration hidden without ai:configure', async () => {
      // Seeded designers do NOT hold ai:configure → once the permission query
      // resolves, AI Configuration is filtered out and only AI Generation
      // remains. A group with a single navigable item collapses to a direct
      // link labeled with the group name.
      renderSidebar();
      await waitFor(() => {
        expect(screen.queryByRole('link', { name: 'AI Configuration' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'AI & Automation' })).toHaveAttribute('href', '/ai-generation');
      });
      expect(screen.queryByRole('button', { name: /AI & Automation/ })).not.toBeInTheDocument();
    });

    it('shows Reports (single Assessment Reports link) and Account', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByText('Reports')).toBeInTheDocument());

      // Designer Reports holds a single item → collapses to a direct link.
      expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');

      await openGroup('Account');
      expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings');
      expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/account');
      expect(screen.queryByRole('link', { name: 'Security' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    });

    it('highlights the Draft status tab deep-link', async () => {
      renderSidebar('/assessments?status=draft');
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Draft Assessments' })).toHaveAttribute('aria-current', 'page');
      });
      expect(screen.getByRole('link', { name: 'My Assessments' })).not.toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Published Assessments' })).not.toHaveAttribute('aria-current', 'page');
    });
  });

  // ══════════════════════════════════════════
  //  Collapse behavior
  // ══════════════════════════════════════════
  describe('collapse behavior', () => {
    beforeEach(() => {
      setUser('PLATFORM_OWNER');
      vi.mocked(permissionService.getMyPermissions).mockResolvedValue(permissionsFor(...NAMES));
    });

    it('collapses to an icon rail, hiding labels', async () => {
      renderSidebar();
      await waitFor(() => expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument());

      const aside = document.querySelector('aside');
      expect(aside).not.toBeNull();
      expect(within(aside!).getByText('Dashboard')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));

      expect(within(aside!).queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    });
  });
});
