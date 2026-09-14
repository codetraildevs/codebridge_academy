import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrgUsage } from '../use-org-usage';
import { useAuthStore } from '@stores/auth-store';
import { subscriptionService, type UsageStats } from '@services/subscription-service';

vi.mock('@services/subscription-service', () => ({
  subscriptionService: {
    getOrgStats: vi.fn(),
    listPlans: vi.fn(),
    getOrgProfile: vi.fn(),
    getOrgStatsById: vi.fn(),
  },
}));

const mockUsage: UsageStats = {
  planName: 'Professional',
  billingCycle: 'MONTHLY',
  pricePerExam: 0,
  totalAssessmentsUsed: 320,
  maxAssessments: 500,
  pendingBills: 0,
  totalBilled: 0,
};

function renderUsageHook() {
  return renderHook(() => useOrgUsage());
}

describe('useOrgUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it('fetches and returns the org usage stats for org-linked users', async () => {
    useAuthStore.setState({
      user: {
        id: 'cand-1',
        email: 'candidate@cbacademy.com',
        firstName: 'Cand',
        lastName: 'One',
        role: 'CANDIDATE',
        userType: 'ORGANIZATION',
        organizationId: 'org-1',
        isActive: true,
        mfaEnabled: false,
      },
      isAuthenticated: true,
    });
    // The endpoint returns the FLAT UsageStats shape (no nested .usage)
    vi.mocked(subscriptionService.getOrgStats).mockResolvedValue(mockUsage);

    const { result } = renderUsageHook();

    await waitFor(() => expect(result.current).toEqual(mockUsage));
    expect(subscriptionService.getOrgStats).toHaveBeenCalledTimes(1);
  });

  it('keeps usage null when the request fails', async () => {
    useAuthStore.setState({
      user: {
        id: 'cand-1',
        email: 'candidate@cbacademy.com',
        firstName: 'Cand',
        lastName: 'One',
        role: 'CANDIDATE',
        userType: 'ORGANIZATION',
        organizationId: 'org-1',
        isActive: true,
        mfaEnabled: false,
      },
      isAuthenticated: true,
    });
    vi.mocked(subscriptionService.getOrgStats).mockRejectedValue(new Error('network'));

    const { result } = renderUsageHook();

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('does not fetch for individual candidates (free-trial users)', () => {
    useAuthStore.setState({
      user: {
        id: 'ind-1',
        email: 'individual@example.com',
        firstName: 'Ind',
        lastName: 'One',
        role: 'INDIVIDUAL_CANDIDATE',
        userType: 'INDIVIDUAL',
        isActive: true,
        mfaEnabled: false,
      },
      isAuthenticated: true,
    });

    const { result } = renderUsageHook();

    expect(result.current).toBeNull();
    expect(subscriptionService.getOrgStats).not.toHaveBeenCalled();
  });
});
