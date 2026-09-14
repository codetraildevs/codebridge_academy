import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubmissionsPage } from '../submissions';
import { candidatePortalApi, type CandidateSubmission } from '@services/candidate-portal-service';

// ── Mocks ──────────────────────────────────────
vi.mock('@services/candidate-portal-service', () => ({
  candidatePortalApi: { listSubmissions: vi.fn() },
}));

// ── Fixtures ───────────────────────────────────
function makeSubmission(overrides: Partial<CandidateSubmission>): CandidateSubmission {
  return {
    id: 'sub-1',
    examRegistrationId: 'reg-1',
    examId: 'a1',
    candidateId: 'cand-1',
    sectionId: null,
    submissionType: 'TASK',
    content: null,
    status: 'COMPLETED',
    aiScore: 82.5,
    finalScore: 78,
    startedAt: '2026-07-01T00:00:00.000Z',
    submittedAt: '2026-07-10T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
    files: [],
    exam: { id: 'a1', title: 'Software Development Practical' },
    ...overrides,
  };
}

const completed = makeSubmission({ id: 'sub-1', status: 'COMPLETED' });
const inReview = makeSubmission({ id: 'sub-2', status: 'UNDER_REVIEW' });
const draft = makeSubmission({ id: 'sub-3', status: 'DRAFT' });

function renderSubmissions(initialPath = '/candidate-portal/submissions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SubmissionsPage />
    </MemoryRouter>,
  );
}

describe('SubmissionsPage — URL-driven results filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(candidatePortalApi.listSubmissions).mockResolvedValue([completed, inReview, draft] as never);
  });

  it('lists every submission by default', async () => {
    renderSubmissions();

    // All three fixtures share this exam title → three submission cards.
    expect(await screen.findAllByText('Software Development Practical')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'My Submissions' })).toBeInTheDocument();
  });

  it('deep-linking with ?status=completed shows only completed submissions as "My Results"', async () => {
    renderSubmissions('/candidate-portal/submissions?status=completed');

    // Page title becomes the results view.
    expect(await screen.findByRole('heading', { name: 'My Results' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('Software Development Practical')).toHaveLength(1);
    });
    // The COMPLETED badge is present; DRAFT / UNDER_REVIEW are filtered out.
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.queryByText('DRAFT')).not.toBeInTheDocument();
    expect(screen.queryByText('UNDER REVIEW')).not.toBeInTheDocument();
  });

  it('shows the results empty state when no completed submissions exist', async () => {
    vi.mocked(candidatePortalApi.listSubmissions).mockResolvedValue([inReview, draft] as never);

    renderSubmissions('/candidate-portal/submissions?status=completed');

    expect(await screen.findByText('No completed results')).toBeInTheDocument();
    expect(
      screen.getByText('Completed assessments with final scores will appear here.'),
    ).toBeInTheDocument();
  });
});
