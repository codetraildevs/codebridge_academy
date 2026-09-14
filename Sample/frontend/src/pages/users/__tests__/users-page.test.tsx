import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersPage } from '../index';
import { userService } from '@services/user-service';
import { roleService } from '@services/role-service';
import { organizationService } from '@services/organization-service';
import { useAuthStore } from '@stores/auth-store';
import type { UserProfile } from '@services/user-service';

vi.mock('@services/user-service', () => ({
  userService: { listUsers: vi.fn(), createUser: vi.fn() },
}));

vi.mock('@services/role-service', () => ({
  roleService: { list: vi.fn() },
}));

vi.mock('@services/organization-service', () => ({
  organizationService: { getProfile: vi.fn(), list: vi.fn() },
}));

const mockUsers: UserProfile[] = [
  {
    id: '1',
    email: 'jean@codebridge.academy',
    firstName: 'Jean',
    lastName: 'Bizimana',
    role: 'ADMIN',
    userType: 'ORGANIZATION',
    organizationId: 'org-1',
    phone: null,
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    email: 'alice@rwandatech.rw',
    firstName: 'Alice',
    lastName: 'Uwera',
    role: 'CANDIDATE',
    userType: 'ORGANIZATION',
    organizationId: 'org-2',
    phone: null,
    isActive: true,
    mfaEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
];

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <UsersPage />
    </QueryClientProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
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
    vi.mocked(roleService.list).mockResolvedValue([]);
  });

  it('lists organization members from the API', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: mockUsers,
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText('jean@codebridge.academy')).toBeInTheDocument();
    expect(screen.getByText('Jean Bizimana')).toBeInTheDocument();
    expect(screen.getByText('alice@rwandatech.rw')).toBeInTheDocument();
    // Users are organization members — the individual chip is gone
    expect(screen.queryByText('Individual')).not.toBeInTheDocument();
  });

  it('creates a user and shows the login credentials to share', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    vi.mocked(userService.createUser).mockResolvedValue({
      id: '3',
      email: 'assessor@cbacademy.com',
      firstName: 'Alice',
      lastName: 'Uwera',
      role: 'ASSESSOR',
      userType: 'ORGANIZATION',
      organizationId: 'org-1',
      phone: null,
      isActive: true,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      temporaryPassword: 'Temp@123',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));

    fireEvent.change(screen.getByLabelText(/Role \*/i), {
      target: { value: 'ASSESSOR' },
    });
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Uwera' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'assessor@cbacademy.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

    // Created in the creator's own organization — no org field is sent
    await waitFor(() =>
      expect(userService.createUser).toHaveBeenCalledWith({
        email: 'assessor@cbacademy.com',
        firstName: 'Alice',
        lastName: 'Uwera',
        role: 'ASSESSOR',
        phone: undefined,
      }),
    );

    // Credentials are shown so the creator can share them for login
    expect(await screen.findByText(/Login Email/i)).toBeInTheDocument();
    expect(screen.getAllByText('assessor@cbacademy.com').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Temp@123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument(),
    );
    expect(userService.listUsers).toHaveBeenCalledTimes(2);
  });

  it('lets the platform owner assign platform owner and create organizations', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));

    const labels = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(labels).toEqual(
      expect.arrayContaining(['Platform Owner', 'Organization Owner', 'Admin', 'Designer', 'Assessor', 'Candidate']),
    );
  });

  it('hides platform owner and organization owner roles for org managers', async () => {
    useAuthStore.setState({
      user: {
        id: '2',
        email: 'owner@cbacademy.com',
        firstName: 'Kelly',
        lastName: 'Munyaneza',
        role: 'ORGANIZATION_OWNER',
        organizationId: 'org-1',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    vi.mocked(organizationService.getProfile).mockResolvedValue({
      id: 'org-1',
      name: 'Codebridge Academy',
      code: 'CBA',
      maxUsers: 10,
    } as never);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Add User/i }));

    // Org managers may only assign in-org roles — never another platform
    // owner or a brand-new organization.
    const labels = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(labels).not.toContain('Platform Owner');
    expect(labels).not.toContain('Organization Owner');
    expect(labels).toEqual(
      expect.arrayContaining(['Admin', 'Designer', 'Assessor', 'Candidate']),
    );
  });

  it('creates an organization together with its owner (platform owner)', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    vi.mocked(userService.createUser).mockResolvedValue({
      id: '4',
      email: 'grace@luminarytech.rw',
      firstName: 'Grace',
      lastName: 'Ingabire',
      role: 'ORGANIZATION_OWNER',
      userType: 'ORGANIZATION',
      organizationId: 'org-9',
      phone: null,
      isActive: true,
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      temporaryPassword: 'Temp@456',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Add User/i }));

    fireEvent.change(screen.getByLabelText(/Role \*/i), {
      target: { value: 'ORGANIZATION_OWNER' },
    });

    // The organization fields (same info as create-organization) appear.
    expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Code/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Organization Name/i), {
      target: { value: 'Luminary Tech' },
    });
    fireEvent.change(screen.getByLabelText(/Organization Code/i), {
      target: { value: 'lumtech' },
    });
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Grace' },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: 'Ingabire' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'grace@luminarytech.rw' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Organization & Owner/i }));

    await waitFor(() =>
      expect(userService.createUser).toHaveBeenCalledWith({
        email: 'grace@luminarytech.rw',
        firstName: 'Grace',
        lastName: 'Ingabire',
        role: 'ORGANIZATION_OWNER',
        phone: undefined,
        organization: {
          name: 'Luminary Tech',
          code: 'LUMTECH',
          organizationType: 'OTHER',
          email: undefined,
          phone: undefined,
          website: undefined,
          address: undefined,
        },
      }),
    );

    expect(await screen.findByText(/Organization Created/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Temp@456')).toBeInTheDocument();
  });

  it('shows an empty state when no users match', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText(/No users match/i)).toBeInTheDocument();
  });

  it('lists platform-created org-less staff (e.g. assessors)', async () => {
    vi.mocked(userService.listUsers).mockResolvedValue({
      data: [
        {
          id: '9',
          email: 'assessor@platform.rw',
          firstName: 'Sara',
          lastName: 'Umutoni',
          role: 'ASSESSOR',
          userType: 'INDIVIDUAL',
          organizationId: null,
          phone: null,
          isActive: true,
          mfaEnabled: false,
          lastLoginAt: null,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    renderPage();

    expect(await screen.findByText('assessor@platform.rw')).toBeInTheDocument();
    expect(screen.getByText('Platform staff')).toBeInTheDocument();
  });
});
