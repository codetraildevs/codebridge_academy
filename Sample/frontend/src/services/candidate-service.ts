import { api } from './api';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CandidateProfile {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  field: { id: string; name: string } | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
  user: { email: string; isActive: boolean } | null;
}

export interface AssignedAssessment {
  id: string;
  title: string;
  description: string | null;
  tradeName: string;
  duration: number | null;
  passingScore: number | null;
  instructions: string | null;
  status: string;
  registeredAt: string;
  examDate: string | null;
  examId: string;
  registrationStatus: string;
  registrationCreatedAt: string;
  organizationName: string | null;
  examType: string | null;
  workspaceTools: string[] | null;
}

export interface AssessmentResult {
  id: string;
  examId: string;
  examTitle: string;
  tradeName: string;
  finalScore: number | null;
  maxScore: number | null;
  passed: boolean | null;
  completedAt: string | null;
  status: string;
  submittedAt: string | null;
  organizationName: string | null;
  sectionScores?: SectionScore[];
  sectionPartScores?: SectionPartScore[];
  submittedDesigns?: SubmittedDesign[];
  savedDesigns?: SavedDesign[];
  sectionDesigns?: { sectionId: string; sectionTitle: string; designs: SubmittedDesign[] }[];
  oralDefenseScore?: number | null;
  aiScore?: number | null;
  assessorScore?: number | null;
  certificateId: string | null;
}

export interface SectionScore {
  sectionId: string;
  sectionTitle: string;
  section: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
}

export interface SectionPartScore {
  sectionId: string;
  sectionTitle: string;
  section: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
  partScores?: {
    part: string;
    label: string | null;
    score: number;
    feedback: string | null;
    fileCount?: number;
  }[];
}

export interface SubmittedDesign {
  id: string;
  diagramType: string;
  name: string | null;
  elements: unknown[];
}

export interface SavedDesign {
  id: string;
  diagramType: string;
  name: string | null;
  elements: unknown[];
}

export interface CandidateCertificate {
  id: string;
  certificateNumber: string;
  tradeName: string;
  overallScore: number | null;
  issuedAt: string;
  issueDate: string;
  expiresAt: string | null;
  expiryDate: string | null;
  status: string;
  verificationUrl: string | null;
  qrCodeUrl: string | null;
  pdfUrl: string | null;
  organizationName: string | null;
}

export interface SessionExam {
  id: string;
  title: string;
  description: string | null;
  tradeName: string;
  tradeCode?: string;
  examType: string;
  duration: number;
  passingScore: number;
  instructions: string | null;
  registrationId: string;
  registrationStatus: string;
  sessionId: string | null;
  sessionStartedAt: string | null;
  workspaceTools?: string[];
  lockedWorkspaceTools?: string[];
  sections: {
    id: string;
    title: string;
    questions: {
      id: string;
      type: string;
      content: string;
      options: unknown;
      points: number;
      savedAnswer: { content: unknown } | null;
    }[];
  }[];
}

export const candidateService = {
  async listCandidates(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    organizationId?: string;
  }): Promise<{ data: CandidateProfile[]; meta: PaginationMeta }> {
    const { data } = await api.get('/candidates', { params });
    return data;
  },

  async createCandidate(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<{ id: string; registrationNumber: string; email: string }> {
    const { data } = await api.post('/candidates', input);
    return data.data;
  },

  async getDashboardStats(): Promise<{
    pendingAssessments: number;
    completedAssessments: number;
    certificatesCount: number;
    averageScore: number;
    competenciesCount: number;
  }> {
    const { data } = await api.get('/candidates/dashboard/stats');
    return data.data;
  },

  async getAssignedAssessments(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: AssignedAssessment[]; meta: PaginationMeta }> {
    const { data } = await api.get('/candidates/assessments', { params });
    return data;
  },

  async getResults(params?: { page?: number; limit?: number }): Promise<{ data: AssessmentResult[]; meta: PaginationMeta }> {
    const { data } = await api.get('/candidates/results', { params });
    return data;
  },

  async getResultDetail(resultId: string): Promise<AssessmentResult> {
    const { data } = await api.get(`/candidates/results/${resultId}`);
    return data.data;
  },

  async getCertificates(params?: { page?: number; limit?: number }): Promise<{ data: CandidateCertificate[]; meta: PaginationMeta }> {
    const { data } = await api.get('/candidates/certificates', { params });
    return data;
  },

  async startAssessment(assessmentId: string): Promise<{ sessionId: string }> {
    const { data } = await api.post(`/candidates/assessments/${assessmentId}/start`);
    return data.data;
  },

  async submitAnswer(assessmentId: string, sectionId: string, questionId: string, content: unknown): Promise<void> {
    await api.post(`/candidates/assessments/${assessmentId}/submit-answer`, { sectionId, questionId, content });
  },

  async finalizeAssessment(sessionId: string): Promise<void> {
    await api.post(`/candidates/sessions/${sessionId}/finalize`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSessionExam(sessionId: string): Promise<any> {
    const { data } = await api.get(`/candidates/sessions/${sessionId}/exam`);
    return data.data;
  },

  async updateProfile(input: { firstName?: string; lastName?: string; phone?: string }): Promise<{ firstName: string; lastName: string; phone: string | null }> {
    const { data } = await api.put('/candidates/profile', input);
    return data.data;
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/candidates/change-password', input);
  },
};

export default candidateService;
