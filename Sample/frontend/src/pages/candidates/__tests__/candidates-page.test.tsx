import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidatesPage } from '../index';
import { candidateService } from '@services/candidate-service';
import { organizationService } from '@services/organization-service';
import { useAuthStore } from '@stores/auth-store';
import type { CandidateProfile } from '@services/candidate-service';
import type { Organization } from '../../../types';

vi.mock('@services/candidate-service', () => ({
  candidateService: { listCandidates: vi.fn(), createCandidate: vi.fn() },
}));

vi.mock('@services/organization-service', () => ({
  organizationService: { getProfile: vi.fn(), list: vi.fn() },
}));

const ORG_PROFILE = {
  id: 'org-1',
  name: 'CodeBridge Academy',
  code: 'CBACADEMY',
  maxCandidates: 100,
  subscriptionStatus: 'ACTIVE',
  isActive: true,
} as Organization;

const mockCandidates: CandidateProfile[] = [
  {
    id: 'cand-1',
    registrationNumber: 'CB-2026-54321',
    firstName: 'Alice',
    lastName: 'Uwera',
    email: 'alice@org.com',
    phone: null,
    status: 'ACTIVE',
    field: null,
    organization: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    user: { email: 'alice@org.com', isActive: true },
  },
];

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CandidatesPage />
    </QueryClientProvider>,
  );
}

describe('CandidatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationService.getProfile).mockResolvedValue(ORG_PROFILE);
  });

  it('lists candidates for a manager and offers the Add Candidate flow', async () => {
    useAuthStore.setState({
      user: {
        id: 'org-owner',
        email: 'admin@cbacademy.com',
        firstName: 'Org',
        lastName: 'Admin',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: mockCandidates,
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText('Alice Uwera')).toBeInTheDocument();
    expect(screen.getByText('CB-2026-54321')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add candidate/i })).toBeInTheDocument();
    // Seat meter reflects the org subscription quota
    expect(await screen.findByText(/1 \/ 100 candidate seats/i)).toBeInTheDocument();
  });

  it('disables Add Candidate when the organization quota is reached', async () => {
    useAuthStore.setState({
      user: {
        id: 'org-owner',
        email: 'admin@cbacademy.com',
        firstName: 'Org',
        lastName: 'Admin',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(organizationService.getProfile).mockResolvedValue({ ...ORG_PROFILE, maxCandidates: 1 });
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: mockCandidates,
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText(/1 \/ 1 candidate seats/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add candidate/i })).toBeDisabled();
  });

  it('disables candidate creation and shows a warning for a CANCELLED subscription', async () => {
    useAuthStore.setState({
      user: {
        id: 'org-owner',
        email: 'admin@cbacademy.com',
        firstName: 'Org',
        lastName: 'Admin',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(organizationService.getProfile).mockResolvedValue({
      ...ORG_PROFILE,
      subscriptionStatus: 'CANCELLED',
    });
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

    renderPage();

    expect(await screen.findByText(/Subscription CANCELLED — adding disabled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add candidate/i })).toBeDisabled();
  });

  it('creates a candidate with login credentials through the form', async () => {
    useAuthStore.setState({
      user: {
        id: 'org-owner',
        email: 'admin@cbacademy.com',
        firstName: 'Org',
        lastName: 'Admin',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    vi.mocked(candidateService.createCandidate).mockResolvedValue({
      id: 'cand-2',
      registrationNumber: 'CB-2026-99999',
      email: 'bob@org.com',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /add candidate/i }));

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Habimana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bob@org.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Passw0rd!' } });

    fireEvent.click(screen.getByRole('button', { name: /create candidate/i }));

    await waitFor(() => {
      expect(candidateService.createCandidate).toHaveBeenCalledWith({
        firstName: 'Bob',
        lastName: 'Habimana',
        email: 'bob@org.com',
        password: 'Passw0rd!',
        phone: undefined,
      });
    });
    expect(await screen.findByText(/registered as CB-2026-99999/i)).toBeInTheDocument();
  });

  it('hides the Add Candidate button for non-manager roles', async () => {
    useAuthStore.setState({
      user: {
        id: 'designer',
        email: 'designer@cbacademy.com',
        firstName: 'Exam',
        lastName: 'Designer',
        role: 'DESIGNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: mockCandidates,
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();

    await screen.findByText('Alice Uwera');
    expect(screen.queryByRole('button', { name: /add candidate/i })).not.toBeInTheDocument();
  });

  it('lists candidates without org scoping and hides manager chrome for a PLATFORM_OWNER', async () => {
    useAuthStore.setState({
      user: {
        id: 'platform-owner',
        email: 'admin@codebridge.academy',
        firstName: 'Platform',
        lastName: 'Owner',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    // Two candidates from DIFFERENT organizations (CB- = CodeBridge, RT- =
    // RwandaTech). The backend treats a PO request as org-agnostic, so the
    // whole platform roster must render — the frontend sends no org filter.
    const crossOrgRoster: CandidateProfile[] = [
      mockCandidates[0]!,
      {
        id: 'cand-9',
        registrationNumber: 'RT-2026-00007',
        firstName: 'Grace',
        lastName: 'Mukamana',
        email: 'grace@rwandatech.rw',
        phone: null,
        status: 'ACTIVE',
        field: null,
        organization: null,
        createdAt: '2026-02-01T00:00:00.000Z',
        user: { email: 'grace@rwandatech.rw', isActive: true },
      },
    ];
    vi.mocked(candidateService.listCandidates).mockResolvedValue({
      data: crossOrgRoster,
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });
    vi.mocked(organizationService.list).mockResolvedValue({
      data: [
        { id: 'org-1', name: 'CodeBridge Academy' },
        { id: 'org-2', name: 'RwandaTech' },
      ] as Organization[],
      meta: { page: 1, limit: 200, totalItems: 2, totalPages: 1 },
    });

    renderPage();

    // Both orgs' candidates are visible — the PO roster is not org-scoped
    expect(await screen.findByText('Alice Uwera')).toBeInTheDocument();
    expect(screen.getByText('Grace Mukamana')).toBeInTheDocument();
    expect(screen.getByText('RT-2026-00007')).toBeInTheDocument();
    // The request itself carries no org filter initially
    expect(candidateService.listCandidates).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      organizationId: undefined,
    });
    // PO gets the org filter + org column so they can scope to one organization
    expect(screen.getByLabelText('Organization')).toBeInTheDocument();
    expect(organizationService.list).toHaveBeenCalled();
    // PO is not an org manager — no org-specific quota chip / add button chrome
    expect(screen.queryByRole('button', { name: /add candidate/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/candidate seats/i)).not.toBeInTheDocument();
    // And the org-profile quota fetch is skipped for PO
    expect(organizationService.getProfile).not.toHaveBeenCalled();
  });
});
