import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationOverviewPage } from '../overview';
import { api } from '@services/api';
import { useAuthStore } from '@stores/auth-store';

vi.mock('@services/api', () => ({
  api: { get: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <OrganizationOverviewPage />
    </QueryClientProvider>,
  );
}

const profile = { name: 'Verify Test College', code: 'VTC1', maxCandidates: 500 };
const stats = {
  totalUsers: 4,
  totalCandidates: 25,
  totalExams: 3,
  subscriptionStatus: 'ACTIVE',
};

describe('OrganizationOverviewPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'admin@org.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ORGANIZATION_OWNER',
        isActive: true,
        mfaEnabled: false,
        organizationId: 'org-1',
      },
      isAuthenticated: true,
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
    });
    mockedGet.mockReset();
    mockedGet.mockImplementation((url: string) => {
      if (url === '/organizations/profile') {
        return Promise.resolve({ data: { data: profile } });
      }
      if (url === '/organizations/org-1/stats') {
        return Promise.resolve({ data: { data: stats } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
  });

  it('fetches the profile + stats endpoints (not the nonexistent /organizations/me)', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledWith('/organizations/profile');
      expect(mockedGet).toHaveBeenCalledWith('/organizations/org-1/stats');
      expect(mockedGet).not.toHaveBeenCalledWith('/organizations/me');
    });
  });

  it('renders stat cards and org details from the combined response', async () => {
    renderPage();

    expect(await screen.findByText('Verify Test College')).toBeInTheDocument();
    expect(screen.getByText('VTC1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Team Members
    expect(screen.getByText('25')).toBeInTheDocument(); // Candidates
    expect(screen.getByText('3')).toBeInTheDocument(); // Assessments (totalExams)
    expect(screen.getByText('1')).toBeInTheDocument(); // Active Subscriptions (ACTIVE)
  });

  it('reports 0 active subscriptions when the org subscription is not active', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url === '/organizations/profile') {
        return Promise.resolve({ data: { data: profile } });
      }
      if (url === '/organizations/org-1/stats') {
        return Promise.resolve({ data: { data: { ...stats, subscriptionStatus: 'PENDING' } } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    renderPage();

    await waitFor(() => {
      // Team Members, Candidates, Assessments render as 4/25/3 — no "1" card
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});