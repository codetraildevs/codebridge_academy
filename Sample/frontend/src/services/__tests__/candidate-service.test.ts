import { describe, it, expect, vi, beforeEach } from 'vitest';
import { candidateService } from '../candidate-service';
import { api } from '../api';

vi.mock('../api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

describe('candidateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists candidates via GET /candidates', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } },
    });

    const result = await candidateService.listCandidates({ search: 'alice' });

    expect(api.get).toHaveBeenCalledWith('/candidates', {
      params: { search: 'alice' },
    });
    expect(result.data).toEqual([]);
  });

  it('creates a candidate via POST /candidates with login credentials', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        data: {
          id: 'cand-1',
          registrationNumber: 'CB-2026-54321',
          email: 'alice@org.com',
        },
      },
    });

    const result = await candidateService.createCandidate({
      firstName: 'Alice',
      lastName: 'Uwera',
      email: 'alice@org.com',
      password: 'Passw0rd!',
    });

    expect(api.post).toHaveBeenCalledWith('/candidates', {
      firstName: 'Alice',
      lastName: 'Uwera',
      email: 'alice@org.com',
      password: 'Passw0rd!',
    });
    expect(result.registrationNumber).toBe('CB-2026-54321');
  });
});
