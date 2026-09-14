import { api } from './api';
import type { Assessment, AssessmentTask, AssessmentChecklistItem, EvidenceRequirement, OralDefenseQuestion, AssessmentWorkspaceModule } from './assessment-builder-service';

// ── Types ──────────────────────────────────────

export interface ExamRegistration {
  id: string;
  examId: string;
  candidateId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  totalScore: number | null;
  registeredAt: string;
  exam: {
    id: string;
    title: string;
    description: string | null;
    duration: number;
    passingScore: number;
    fieldId: string;
  };
  sessions: Array<{ id: string; startedAt: string; endedAt: string | null }>;
  submissions: Array<{
    id: string;
    status: string;
    aiScore: number | null;
    finalScore: number | null;
    sectionId: string | null;
    submittedAt: string | null;
    createdAt: string;
  }>;
  latestSession: { id: string; startedAt: string; endedAt: string | null } | null;
  totalSubmissions: number;
  submittedCount: number;
  draftCount: number;
}

export interface ExamSession {
  id: string;
  examRegistrationId: string;
  userId: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface CandidateSubmission {
  id: string;
  examRegistrationId: string;
  examId: string;
  candidateId: string;
  sectionId: string | null;
  submissionType: string;
  content: unknown;
  status: string;
  aiScore: number | null;
  finalScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files: SubmissionFile[];
  aiAssessments?: AiAssessmentSummary[];
  exam?: { id: string; title: string };
  registration?: { status: string };
}

export interface SubmissionFile {
  id: string;
  submissionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: string;
}

export interface AiAssessmentSummary {
  id: string;
  overallScore: number | null;
  confidenceScore: number | null;
  status: string;
  scores: Array<{ criterionName: string; score: number; maxScore: number }>;
}

export interface CandidateProgress {
  registrationId: string;
  examId: string;
  examTitle: string;
  status: string;
  registeredAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalSubmissions: number;
  submittedCount: number;
  draftCount: number;
  latestSession: { id: string; startedAt: string; endedAt: string | null } | null;
}

export interface AssessmentWorkspace {
  assessment: Assessment & {
    tasks: AssessmentTask[];
    checklistItems: AssessmentChecklistItem[];
    evidenceReqs: EvidenceRequirement[];
    oralQuestions: OralDefenseQuestion[];
    workspaceModules: AssessmentWorkspaceModule[];
  };
  registration: ExamRegistration | null;
  submissions: CandidateSubmission[];
}

// ── API Service ─────────────────────────────────

export const candidatePortalApi = {
  // Assessments
  async listAvailableAssessments(): Promise<Assessment[]> {
    const { data } = await api.get('/candidate-portal/assessments');
    return data;
  },

  async registerForAssessment(assessmentId: string): Promise<ExamRegistration> {
    const { data } = await api.post('/candidate-portal/assessments/register', { assessmentId });
    return data;
  },

  // Registrations
  async listRegistrations(): Promise<ExamRegistration[]> {
    const { data } = await api.get('/candidate-portal/registrations');
    return data;
  },

  async withdrawFromRegistration(registrationId: string): Promise<ExamRegistration> {
    const { data } = await api.put(`/candidate-portal/registrations/${registrationId}/withdraw`);
    return data;
  },

  // Sessions
  async startSession(assessmentId: string, registrationId: string): Promise<ExamSession> {
    const { data } = await api.post('/candidate-portal/sessions/start', { assessmentId, registrationId });
    return data;
  },

  async sessionHeartbeat(sessionId: string): Promise<void> {
    await api.put(`/candidate-portal/sessions/${sessionId}/heartbeat`);
  },

  // Workspace
  async getAssessmentWorkspace(assessmentId: string): Promise<AssessmentWorkspace> {
    const { data } = await api.get(`/candidate-portal/assessments/${assessmentId}/workspace`);
    return data;
  },

  // Submissions
  async listSubmissions(): Promise<CandidateSubmission[]> {
    const { data } = await api.get('/candidate-portal/submissions');
    return data;
  },

  async createOrUpdateSubmission(input: {
    assessmentId: string;
    registrationId: string;
    sectionId?: string;
    submissionType: string;
    content?: unknown;
  }): Promise<CandidateSubmission> {
    const { data } = await api.post('/candidate-portal/submissions', input);
    return data;
  },

  async submitSubmission(submissionId: string): Promise<CandidateSubmission> {
    const { data } = await api.put(`/candidate-portal/submissions/${submissionId}/submit`);
    return data;
  },

  async getSubmission(id: string): Promise<CandidateSubmission> {
    const { data } = await api.get(`/candidate-portal/submissions/${id}`);
    return data;
  },

  // Files
  async addSubmissionFile(input: {
    submissionId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<SubmissionFile> {
    const { data } = await api.post('/candidate-portal/files', input);
    return data;
  },

  /**
   * Upload a file to a submission using multipart/form-data (via multer on backend).
   *
   * @param submissionId - The submission UUID to attach the file to
   * @param file - The browser File object to upload
   * @param onProgress - Optional callback receiving upload progress (0-100)
   */
  async uploadSubmissionFile(
    submissionId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<SubmissionFile> {
    const formData = new FormData();
    formData.append('submissionId', submissionId);
    formData.append('file', file);

    const { data } = await api.post('/candidate-portal/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(percent);
        }
      },
    });
    return data;
  },

  /**
   * Download a submission file by its fileId.
   * Returns the raw blob which can be used to create an object URL.
   */
  async downloadSubmissionFile(fileId: string): Promise<Blob> {
    const { data } = await api.get(`/candidate-portal/files/${fileId}`, {
      responseType: 'blob',
    });
    return data;
  },

  /**
   * Build a direct download URL for a submission file.
   * Uses the API base URL since the download endpoint returns file bytes.
   */
  getSubmissionFileUrl(fileId: string): string {
    return `/api/candidate-portal/files/${fileId}`;
  },

  // Progress
  async getProgress(): Promise<CandidateProgress[]> {
    const { data } = await api.get('/candidate-portal/progress');
    return data;
  },
};

export default candidatePortalApi;
