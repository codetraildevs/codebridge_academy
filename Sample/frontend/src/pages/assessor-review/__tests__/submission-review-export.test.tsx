import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SubmissionReviewPage } from '@pages/assessor-review/submission-review';
import { assessorReviewApi, type SubmissionReviewDetail } from '@services/assessor-review-service';
import { useAuthStore } from '@stores/auth-store';

vi.mock('@services/assessor-review-service', () => ({
  assessorReviewApi: {
    getSubmission: vi.fn(),
    downloadChecklistPdf: vi.fn(),
    upsertReview: vi.fn(),
    updateSubmissionScore: vi.fn(),
    listSubmissions: vi.fn(),
    listCompletedReviews: vi.fn(),
    getStats: vi.fn(),
  },
}));

const detail: SubmissionReviewDetail = {
  id: 'sub-1',
  examRegistrationId: 'reg-1',
  examId: 'exam-1',
  candidateId: 'cand-1',
  submissionType: 'PRACTICAL',
  status: 'UNDER_REVIEW',
  content: null,
  aiScore: 55,
  assessorScore: null,
  finalScore: null,
  submittedAt: '2026-08-08T10:00:00.000Z',
  createdAt: '2026-08-08T09:00:00.000Z',
  candidate: {
    id: 'cand-1',
    firstName: 'Jean',
    lastName: 'Claude',
    registrationNumber: 'REG-2026-0042',
    email: 'jean.claude@example.com',
    photoUrl: null,
  },
  exam: {
    id: 'exam-1',
    title: 'Software Development Practical',
    description: null,
    passingScore: 50,
    duration: 120,
    checklistItems: [
      {
        id: 'item-1',
        title: 'Employee entity is drawn',
        description: '1.1. Conceptual database schema is properly designed',
        section: 'Preliminary activities (15%)',
        weight: 2,
      },
      {
        id: 'item-2',
        title: 'Employee attributes are included',
        description: '1.1. Conceptual database schema is properly designed',
        section: 'Preliminary activities (15%)',
        weight: 2,
      },
      {
        id: 'item-3',
        title: 'Position entity is drawn',
        description: '1.2. Entity relationships are correct',
        section: 'Preliminary activities (15%)',
        weight: 2,
      },
    ],
  },
  registration: {
    id: 'reg-1',
    status: 'SUBMITTED',
    totalScore: null,
    startedAt: null,
    completedAt: null,
  },
  files: [],
  aiAssessments: [],
  existingReview: {
    id: 'rev-1',
    status: 'COMPLETED',
    score: 7,
    feedback: 'Good work overall',
    rubricScores: { 'item-1': 2, 'item-2': 2 },
    verificationStatus: 'VERIFIED',
    flaggedReasons: [],
    reviewedAt: '2026-08-08T11:00:00.000Z',
    createdAt: '2026-08-08T11:00:00.000Z',
    assessor: {
      id: 'assessor-1',
      firstName: 'Assessor',
      lastName: 'Jane Doe',
      email: 'assessor@codebridge.academy',
    },
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/assessor-review/sub-1']}>
      <Routes>
        <Route path="/assessor-review/:id" element={<SubmissionReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SubmissionReviewPage — export marking sheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue(detail);
    vi.mocked(assessorReviewApi.downloadChecklistPdf).mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' }),
    );
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    // The page pre-fills the sheet with the logged-in assessor's name.
    useAuthStore.getState().setAuth(
      {
        id: 'assessor-1',
        email: 'assessor@codebridge.academy',
        firstName: 'Assessor',
        lastName: 'Jane Doe',
        role: 'ASSESSOR',
        isActive: true,
        mfaEnabled: false,
      },
      'access-token',
      'refresh-token',
    );
  });

  afterEach(() => {
    useAuthStore.getState().logout();
    vi.unstubAllGlobals();
  });

  it('downloads a marking sheet pre-filled with candidate, assessor and review scores', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /export marking sheet/i }));

    await waitFor(() => {
      expect(assessorReviewApi.downloadChecklistPdf).toHaveBeenCalledWith(
        'exam-1',
        {
          name: 'Jean Claude',
          registrationNumber: 'REG-2026-0042',
        },
        'Assessor Jane Doe',
        'rev-1',
      );
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('passes null reviewId when the candidate has no review yet', async () => {
    const withoutReview = { ...detail, existingReview: null };
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue(withoutReview);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /export marking sheet/i }));

    await waitFor(() => {
      expect(assessorReviewApi.downloadChecklistPdf).toHaveBeenCalledWith(
        'exam-1',
        expect.objectContaining({ name: 'Jean Claude' }),
        'Assessor Jane Doe',
        null,
      );
    });
  });

  it('does not export while the submission is still loading', () => {
    vi.mocked(assessorReviewApi.getSubmission).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByRole('button', { name: /export marking sheet/i })).not.toBeInTheDocument();
    expect(assessorReviewApi.downloadChecklistPdf).not.toHaveBeenCalled();
  });
});

describe('SubmissionReviewPage — rubric scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue(detail);
    vi.mocked(assessorReviewApi.upsertReview).mockResolvedValue({
      id: 'rev-1',
      status: 'IN_REVIEW',
      score: null,
    } as any);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    useAuthStore.getState().setAuth(
      {
        id: 'assessor-1',
        email: 'assessor@codebridge.academy',
        firstName: 'Assessor',
        lastName: 'Jane Doe',
        role: 'ASSESSOR',
        isActive: true,
        mfaEnabled: false,
      },
      'access-token',
      'refresh-token',
    );
  });

  afterEach(() => {
    useAuthStore.getState().logout();
    vi.unstubAllGlobals();
  });

  it('pre-fills the rubric inputs from the existing review rubricScores', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rubric/i }));

    expect(screen.getByLabelText('Score for Employee entity is drawn')).toHaveValue(2);
    expect(screen.getByLabelText('Score for Employee attributes are included')).toHaveValue(2);
    expect(screen.getByLabelText('Score for Position entity is drawn')).toHaveValue(null);
  });

  it('saves entered rubric scores with the review, keyed by checklist item id', async () => {
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue({ ...detail, existingReview: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rubric/i }));

    fireEvent.change(screen.getByLabelText('Score for Employee entity is drawn'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Score for Employee entity is drawn'));
    fireEvent.change(screen.getByLabelText('Score for Position entity is drawn'), { target: { value: '1' } });
    fireEvent.blur(screen.getByLabelText('Score for Position entity is drawn'));

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(assessorReviewApi.upsertReview).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({ rubricScores: { 'item-1': 2, 'item-3': 1 } }),
      );
    });
  });

  it('persists an empty rubric record when all scores are cleared', async () => {
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue({ ...detail, existingReview: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rubric/i }));

    fireEvent.change(screen.getByLabelText('Score for Employee entity is drawn'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Score for Employee entity is drawn'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear score for Employee entity is drawn' }));

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    // An empty object is sent on purpose so the backend clears stored scores.
    await waitFor(() => {
      expect(assessorReviewApi.upsertReview).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({ rubricScores: {} }),
      );
    });
  });

  it('derives the assessor score from the rubric total and saves it with the review', async () => {
    vi.mocked(assessorReviewApi.getSubmission).mockResolvedValue({ ...detail, existingReview: null });
    vi.mocked(assessorReviewApi.upsertReview).mockResolvedValue({
      id: 'rev-1',
      status: 'IN_REVIEW',
      score: 66.7,
    } as any);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jean Claude')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rubric/i }));

    // 2 + 2 of 6 marks → 66.7%
    fireEvent.change(screen.getByLabelText('Score for Employee entity is drawn'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Score for Employee entity is drawn'));
    fireEvent.change(screen.getByLabelText('Score for Employee attributes are included'), { target: { value: '2' } });
    fireEvent.blur(screen.getByLabelText('Score for Employee attributes are included'));

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(assessorReviewApi.upsertReview).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          rubricScores: { 'item-1': 2, 'item-2': 2 },
          score: 66.7,
        }),
      );
    });
  });
});
