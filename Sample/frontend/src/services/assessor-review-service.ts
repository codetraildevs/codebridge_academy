import { api } from './api';

// ── Types ──────────────────────────────────────

export interface SubmissionForReview {
  id: string;
  examRegistrationId: string;
  examId: string;
  candidateId: string;
  submissionType: string;
  status: string;
  aiScore: number | null;
  assessorScore: number | null;
  finalScore: number | null;
  submittedAt: string | null;
  createdAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
  };
  exam: {
    id: string;
    title: string;
    fieldId: string;
    passingScore: number;
  };
  registration: {
    id: string;
    status: string;
  };
  aiAssessments: Array<{
    id: string;
    overallScore: number | null;
    confidenceScore: number | null;
    status: string;
    evaluatedAt: string | null;
  }>;
  files: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  existingReview: {
    id: string;
    status: string;
    score: number | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
}

export interface SubmissionReviewDetail {
  id: string;
  examRegistrationId: string;
  examId: string;
  candidateId: string;
  submissionType: string;
  status: string;
  content: unknown;
  aiScore: number | null;
  assessorScore: number | null;
  finalScore: number | null;
  submittedAt: string | null;
  createdAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
    photoUrl: string | null;
  };
  exam: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    duration: number;
    /**
     * The assessment's checklist items (published assessments sync an Exam
     * record with the same UUID, so exam.id is the assessment id). Used by the
     * rubric scoring UI — scores are keyed by these item ids, which is exactly
     * what the marking-sheet export matches its Scored column against.
     */
    checklistItems: Array<{
      id: string;
      title: string;
      description: string | null;
      section: string | null;
      weight: number;
    }>;
  };
  registration: {
    id: string;
    status: string;
    totalScore: number | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  files: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    uploadedAt: string;
  }>;
  aiAssessments: Array<{
    id: string;
    overallScore: number | null;
    confidenceScore: number | null;
    status: string;
    feedback: string | null;
    competencyScores: unknown;
    evaluatedAt: string | null;
    scores: Array<{
      id: string;
      criterionName: string;
      score: number;
      maxScore: number;
      feedback: string | null;
    }>;
  }>;
  existingReview: {
    id: string;
    status: string;
    score: number | null;
    feedback: string | null;
    rubricScores: Record<string, number> | null;
    verificationStatus: string;
    flaggedReasons: string[];
    reviewedAt: string | null;
    createdAt: string;
    assessor: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

export interface ReviewStats {
  pendingSubmissions: number;
  inProgress: number;
  completed: number;
  totalNeedingReview: number;
}

export interface CompletedReview {
  id: string;
  submissionId: string;
  assessorId: string;
  status: string;
  score: number | null;
  feedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
  submission: {
    id: string;
    aiScore: number | null;
    assessorScore: number | null;
    finalScore: number | null;
    status: string;
    submittedAt: string | null;
    exam: { id: string; title: string };
    candidate: { firstName: string; lastName: string; registrationNumber: string };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

// ── API Service ─────────────────────────────────

export const assessorReviewApi = {
  async listSubmissions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    examId?: string;
    search?: string;
  }): Promise<PaginatedResponse<SubmissionForReview>> {
    const { data } = await api.get('/assessor-review/submissions', { params });
    return data;
  },

  async getSubmission(id: string): Promise<SubmissionReviewDetail> {
    const { data } = await api.get(`/assessor-review/submissions/${id}`);
    return data;
  },

  async upsertReview(
    submissionId: string,
    input: {
      score?: number;
      feedback?: string;
      rubricScores?: Record<string, number>;
      status?: string;
      verificationStatus?: string;
      flaggedReasons?: string[];
    },
  ): Promise<{ id: string; status: string; score: number | null }> {
    const { data } = await api.put(`/assessor-review/submissions/${submissionId}/review`, input);
    return data;
  },

  async updateSubmissionScore(
    submissionId: string,
    input: { assessorScore?: number; finalScore?: number },
  ): Promise<void> {
    await api.put(`/assessor-review/submissions/${submissionId}/score`, input);
  },

  async listCompletedReviews(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompletedReview>> {
    const { data } = await api.get('/assessor-review/reviews/completed', { params });
    return data;
  },

  /**
   * Download a printable marking-sheet PDF for the candidate. Pass the
   * candidate's name and registration number to pre-fill the sheet header, the
   * logged-in assessor's name to pre-fill the assessor signature line, and the
   * review id to pre-fill the Scored column from its rubricScores (loaded
   * server-side); omitted values keep the sheet blank for hand-marking.
   */
  async downloadChecklistPdf(
    assessmentId: string,
    candidate?: { name: string; registrationNumber: string },
    assessorName?: string,
    reviewId?: string | null,
  ): Promise<Blob> {
    const { data } = await api.get(`/assessment-builder/${assessmentId}/checklist/export`, {
      params: {
        candidateName: candidate?.name,
        registrationNumber: candidate?.registrationNumber,
        assessorName,
        reviewId,
      },
      responseType: 'blob',
    });
    return data;
  },

  async getStats(): Promise<ReviewStats> {
    const { data } = await api.get('/assessor-review/stats');
    return data;
  },
};

export default assessorReviewApi;
