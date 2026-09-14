import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequirePermission, PermissionGuard } from '../require-permission';
import { useAuthStore } from '@stores/auth-store';
import { permissionService } from '@services/permission-service';
import type { Permission } from '../../../types/permissions';

// ── Mocks ──────────────────────────────────
vi.mock('@services/permission-service', () => ({
  permissionService: { getMyPermissions: vi.fn() },
}));

function permissionsFor(...names: string[]): Permission[] {
  return names.map((name) => ({ id: name, name, description: null, module: name.split(':')[0]! }));
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderAt(
  ui: React.ReactElement,
  initialPath = '/protected',
) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/protected" element={ui} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/auth/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PermissionGuard — route-level permission gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'user@qualexas.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
  });

  it('renders the protected content when the user has the permission', async () => {
    vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
      permissionsFor('organizations:view', 'dashboard:view'),
    );

    renderAt(
      <PermissionGuard permissions="organizations:view">
        <div>Organizations admin page</div>
      </PermissionGuard>,
    );

    expect(await screen.findByText('Organizations admin page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when the user lacks the permission', async () => {
    vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
      permissionsFor('dashboard:view'),
    );

    renderAt(
      <PermissionGuard permissions="organizations:view">
        <div>Organizations admin page</div>
      </PermissionGuard>,
    );

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Organizations admin page')).not.toBeInTheDocument();
  });

  it('redirects to /auth/login when the user is not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });

    renderAt(
      <PermissionGuard permissions="organizations:view">
        <div>Organizations admin page</div>
      </PermissionGuard>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});

describe('RequirePermission — element-level gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'user@qualexas.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'PLATFORM_OWNER',
        isActive: true,
        mfaEnabled: false,
      },
      accessToken: 't',
      refreshToken: 'r',
      isAuthenticated: true,
    });
  });

  it('renders the fallback when the user lacks the permission (no redirect)', async () => {
    vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
      permissionsFor('dashboard:view'),
    );

    renderAt(
      <RequirePermission permissions="ai:configure" fallback={<div>No access — upgrade required</div>}>
        <div>AI configuration panel</div>
      </RequirePermission>,
    );

    expect(await screen.findByText('No access — upgrade required')).toBeInTheDocument();
    expect(screen.queryByText('AI configuration panel')).not.toBeInTheDocument();
  });

  it('supports mode="any" so the user needs only one of the listed permissions', async () => {
    vi.mocked(permissionService.getMyPermissions).mockResolvedValue(
      permissionsFor('exams:create'),
    );

    renderAt(
      <RequirePermission permissions={['exams:create', 'exams:manage']} mode="any">
        <div>Exam creation tools</div>
      </RequirePermission>,
    );

    expect(await screen.findByText('Exam creation tools')).toBeInTheDocument();
  });

  it('waits for permission data before rendering a decision', async () => {
    let resolvePermissions: (value: Permission[]) => void = () => {};
    vi.mocked(permissionService.getMyPermissions).mockReturnValue(
      new Promise((resolve) => {
        resolvePermissions = resolve;
      }),
    );

    renderAt(
      <PermissionGuard permissions="audit:view">
        <div>Audit logs page</div>
      </PermissionGuard>,
    );

    // While permissions are loading, a lightweight status placeholder is shown
    // instead of a blank page.
    await waitFor(() => {
      expect(screen.getByRole('status', { name: /checking permissions/i })).toBeInTheDocument();
      expect(screen.queryByText('Audit logs page')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
    });

    resolvePermissions(permissionsFor('audit:view'));
    expect(await screen.findByText('Audit logs page')).toBeInTheDocument();
  });

  it('fails OPEN when the permission lookup errors — the backend stays the security layer', async () => {
    vi.mocked(permissionService.getMyPermissions).mockRejectedValue(new Error('API down'));

    renderAt(
      <PermissionGuard permissions="organizations:view">
        <div>Organizations admin page</div>
      </PermissionGuard>,
    );

    // A failed permission fetch must not permanently blank the route.
    // (usePermissions retries once, so allow a few seconds for the error to settle.)
    expect(
      await screen.findByText('Organizations admin page', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });
});
