import { api } from './api';

export interface AiEvaluation {
  id: string;
  submissionId: string | null;
  assessmentType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  overallScore: number | null;
  confidenceScore: number | null;
  competencyScores: Record<string, number> | null;
  feedback: string | null;
  riskIndicators: Record<string, unknown> | null;
  detailedResults: Record<string, unknown> | null;
  evaluatedAt: string | null;
  createdAt: string;
  scores?: AiScore[];
  submission?: {
    id: string;
    submissionType: string;
    status: string;
    aiScore: number | null;
    finalScore: number | null;
  };
}

export interface AiScore {
  id: string;
  aiAssessmentId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  feedback: string | null;
  createdAt: string;
}

export interface EvaluationSummary {
  totalEvaluations: number;
  totalSubmissions: number;
  averageScore: number;
  averageConfidence: number;
  statusBreakdown: {
    completed: number;
    failed: number;
    pending: number;
    processing: number;
  };
  recentEvaluations: Array<{
    id: string;
    overallScore: number | null;
    confidenceScore: number | null;
    evaluatedAt: string | null;
    status: string;
  }>;
}

export const aiEvaluationService = {
  /**
   * Trigger AI evaluation for a submission.
   */
  async trigger(data: {
    assessmentId: string;
    submissionId: string;
    examRegistrationId: string;
    candidateId: string;
  }): Promise<{ id: string; status: string }> {
    const { data: result } = await api.post('/ai-evaluations/trigger', data);
    return result;
  },

  /**
   * Get an AI evaluation by ID with all scores.
   */
  async getById(id: string): Promise<AiEvaluation> {
    const { data } = await api.get(`/ai-evaluations/${id}`);
    return data;
  },

  /**
   * List all AI evaluations for a submission.
   */
  async listBySubmission(submissionId: string): Promise<AiEvaluation[]> {
    const { data } = await api.get(`/ai-evaluations/submissions/${submissionId}`);
    return data;
  },

  /**
   * Get aggregated AI evaluation summary for an assessment.
   */
  async getAssessmentSummary(assessmentId: string): Promise<EvaluationSummary> {
    const { data } = await api.get(`/ai-evaluations/assessments/${assessmentId}/summary`);
    return data;
  },
};

export default aiEvaluationService;
