import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscriptionService } from '../subscription-service';
import { api } from '../api';

vi.mock('../api', () => ({
  api: { get: vi.fn() },
}));

const flatUsage = {
  planName: 'Starter',
  billingCycle: 'MONTHLY',
  pricePerExam: 0,
  totalAssessmentsUsed: 7,
  maxAssessments: 500,
  pendingBills: 0,
  totalBilled: 0,
};

describe('subscriptionService.getOrgStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the FLAT usage shape from /usage/stats', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: flatUsage } });

    const result = await subscriptionService.getOrgStats();

    expect(api.get).toHaveBeenCalledWith('/usage/stats');
    // The banner hook reads this directly — no nested .usage wrapper.
    expect(result).toEqual(flatUsage);
    expect((result as any).usage).toBeUndefined();
  });
});

describe('subscriptionService.getOrgStatsById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hits the org stats endpoint (OrgStats shape with nested usage)', async () => {
    const orgStats = {
      organizationId: 'org-1',
      totalUsers: 3,
      totalCandidates: 7,
      totalExams: 1,
      activeExams: 0,
      completedAssessments: 2,
      passRate: 50,
      averageScore: 65,
      totalCertificates: 1,
      subscriptionStatus: 'ACTIVE',
      seatUsageTrend: [
        { month: 'February', year: 2026, seatsConsumed: 4 },
        { month: 'March', year: 2026, seatsConsumed: 3 },
      ],
      usage: flatUsage,
    };
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: orgStats } });

    const result = await subscriptionService.getOrgStatsById('org-1');

    expect(api.get).toHaveBeenCalledWith('/organizations/org-1/stats');
    expect(result.usage?.totalAssessmentsUsed).toBe(7);
    expect(result.totalExams).toBe(1);
    expect(result.seatUsageTrend).toHaveLength(2);
    expect(result.seatUsageTrend[0]).toMatchObject({ month: 'February', seatsConsumed: 4 });
  });
});
