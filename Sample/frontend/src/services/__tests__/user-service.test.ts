import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user-service';
import { api } from '../api';

vi.mock('../api', () => ({
  api: { get: vi.fn() },
}));

describe('userService.listUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests /users with the given pagination and filters', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      },
    });

    const result = await userService.listUsers({ page: 2, search: 'jean' });

    expect(api.get).toHaveBeenCalledWith('/users', {
      params: { page: 2, search: 'jean' },
    });
    expect(result.meta.totalItems).toBe(0);
  });

  it('returns the users from the response payload', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            id: '1',
            email: 'jean@example.com',
            firstName: 'Jean',
            lastName: 'Bizimana',
            role: 'INDIVIDUAL_CANDIDATE',
            userType: 'INDIVIDUAL',
            organizationId: null,
            phone: null,
            isActive: true,
            mfaEnabled: false,
            lastLoginAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      },
    });

    const result = await userService.listUsers({});
    const [first] = result.data;

    expect(first?.email).toBe('jean@example.com');
    expect(first?.userType).toBe('INDIVIDUAL');
  });
});
