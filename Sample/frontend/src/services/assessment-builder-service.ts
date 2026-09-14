import { api } from './api';

export interface Assessment {
  id: string;
  organizationId: string | null;
  fieldId: string;
  title: string;
  description: string | null;
  assessmentType: string;
  difficulty: string;
  status: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  instructions: unknown;
  scenario: unknown;
  resources: unknown;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  field?: { id: string; name: string; code: string };
  organization?: { id: string; name: string };
  tasks?: AssessmentTask[];
  checklistItems?: AssessmentChecklistItem[];
  evidenceReqs?: EvidenceRequirement[];
  aiRules?: AiEvaluationRule[];
  oralQuestions?: OralDefenseQuestion[];
  workspaceModules?: AssessmentWorkspaceModule[];
  _count?: { tasks: number; checklistItems: number; aiRules: number; oralQuestions: number };
}

export interface AssessmentTask {
  id: string;
  assessmentId: string;
  title: string;
  description: string | null;
  taskType: string;
  orderIndex: number;
  points: number;
  expectedOutput: string | null;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentChecklistItem {
  id: string;
  assessmentId: string;
  title: string;
  description: string | null;
  /** Standard marking-sheet section (e.g. "Process and fulfillment of the task (40%)"). */
  section: string | null;
  weight: number;
  isRequired: boolean;
  assessmentMethod: string;
  expectedResult: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface EvidenceRequirement {
  id: string;
  assessmentId: string;
  title: string;
  description: string | null;
  evidenceType: string;
  isRequired: boolean;
  maxFiles: number;
  orderIndex: number;
  createdAt: string;
}

export interface AiEvaluationRule {
  id: string;
  assessmentId: string;
  ruleName: string;
  description: string | null;
  ruleType: string;
  config: unknown;
  weight: number;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface OralDefenseQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: string;
  category: string | null;
  orderIndex: number;
  timeLimitSeconds: number | null;
  passingScore: number | null;
  createdAt: string;
}

export interface WorkspaceModule {
  id: string;
  moduleKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  configSchema: unknown;
  isActive: boolean;
  createdAt: string;
}

export interface AssessmentWorkspaceModule {
  assessmentId: string;
  workspaceModuleId: string;
  orderIndex: number;
  config: unknown;
  workspaceModule?: WorkspaceModule;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CreateAssessmentInput {
  organizationId?: string;
  fieldId: string;
  title: string;
  /** Null explicitly clears a previously-saved description. */
  description?: string | null;
  assessmentType?: string;
  difficulty?: string;
  durationMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  instructions?: unknown;
  scenario?: unknown;
  resources?: unknown;
  allowOralDefense?: boolean;
  requireFullScreen?: boolean;
  requireWebcam?: boolean;
  /** Nested content created atomically with the assessment (document import flow). */
  tasks?: Array<{
    title: string;
    description?: string;
    taskType?: string;
    orderIndex?: number;
    points?: number;
    expectedOutput?: string;
    config?: unknown;
  }>;
  checklistItems?: Array<{
    title: string;
    description?: string;
    section?: string;
    weight?: number;
    isRequired?: boolean;
    assessmentMethod?: string;
    expectedResult?: string;
    orderIndex?: number;
  }>;
}

export interface ImportedChecklistSection {
  /** Section name AS PRINTED in the document (e.g. "Process and fulfillment of the task (40%)") — detected dynamically, never hardcoded. */
  name: string;
  /** Section weight from "(40%)" — null when the document prints none. */
  weightPct: number | null;
  /** Section subtotal from "Subtotal /32 marks" — null when not printed. */
  subtotalMarks: number | null;
}

/** Draft returned by the document import endpoint. */
export interface ImportedAssessmentDraft {
  title: string | null;
  description: string | null;
  scenario: { html: string } | null;
  tasks: Array<{
    title: string;
    description: string;
    taskType?: string;
    points?: number;
  }>;
  /** Structured hierarchy returned by the extraction engine (sections → criteria → indicators → elements). */
  checklist: {
    sections: ImportedChecklistSection[];
    /** Grand total from "Total Marks 100" — null when not printed. */
    totalMarks: number | null;
    /** Verification warnings for the assessor (e.g. subtotals ≠ printed total). */
    warnings: string[];
  };
  checklistItems: Array<{
    title: string;
    description: string;
    weight: number;
    isRequired?: boolean;
    section: string | null;
  }>;
}

export interface UpdateAssessmentInput extends Partial<CreateAssessmentInput> {
  status?: string;
}

// ── Auto-Configuration (Analyze & Configure) Types ──

export interface AutoConfigEvidenceItem {
  title: string;
  description: string;
  evidenceType: string;
  isRequired: boolean;
  maxFiles: number;
  orderIndex: number;
  /** Why this was suggested — shown in the review UI. */
  reason: string;
}

export interface AutoConfigAiRuleItem {
  ruleName: string;
  description: string;
  ruleType: string;
  config: Record<string, unknown>;
  weight: number;
  isActive: boolean;
  orderIndex: number;
  reason: string;
}

export interface AutoConfigOralQuestionItem {
  questionText: string;
  questionType: string;
  category: string;
  orderIndex: number;
  timeLimitSeconds: number | null;
  passingScore: number | null;
  reason: string;
}

export interface AutoConfigWorkspaceModuleItem {
  moduleKey: string;
  name: string;
  orderIndex: number;
  reason: string;
}

export interface AutoConfigDraft {
  field: { id: string; name: string; code: string } | null;
  evidenceReqs: AutoConfigEvidenceItem[];
  aiRules: AutoConfigAiRuleItem[];
  oralQuestions: AutoConfigOralQuestionItem[];
  workspaceModules: AutoConfigWorkspaceModuleItem[];
  summary: {
    fieldName: string;
    taskCount: number;
    checklistCount: number;
    competencyCount: number;
    evidenceCount: number;
    aiRuleCount: number;
    oralQuestionCount: number;
    workspaceModuleCount: number;
    generatedAt: string;
  };
}

/** Reviewed draft payload sent to the apply endpoint. */
export interface ApplyAutoConfigPayload {
  evidenceReqs?: Array<{
    title: string;
    description?: string | null;
    evidenceType?: string;
    isRequired?: boolean;
    maxFiles?: number;
    orderIndex?: number;
  }>;
  aiRules?: Array<{
    ruleName: string;
    description?: string | null;
    ruleType?: string;
    config?: unknown;
    weight?: number;
    isActive?: boolean;
    orderIndex?: number;
  }>;
  oralQuestions?: Array<{
    questionText: string;
    questionType?: string;
    category?: string | null;
    orderIndex?: number;
    timeLimitSeconds?: number | null;
    passingScore?: number | null;
  }>;
  workspaceModuleKeys?: string[];
}

// ── Enrollment Types ───────────────────────────

export interface Enrollment {
  id: string;
  status: string;
  registeredAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalScore: number | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    registrationNumber: string;
    status: string;
    enrollmentDate: string;
    field: { name: string } | null;
  };
  totalSubmissions: number;
  submittedCount: number;
  latestSession: { id: string; startedAt: string; endedAt: string | null; ipAddress: string | null } | null;
  latestSubmission: { id: string; status: string; aiScore: number | null; finalScore: number | null; submittedAt: string | null } | null;
}

export interface BulkEnrollResult {
  totalProcessed: number;
  successCount: number;
  results: Array<{ candidateId: string; success: boolean; status: string; error?: string }>;
}

export const assessmentBuilderApi = {
  // ── Assessments ──────────────────────────────

  /**
   * Uploads a PDF / Word (.docx) / text assessment document and parses it into
   * editable sections (scenario, tasks, checklist).
   */
  async importDocument(file: File): Promise<ImportedAssessmentDraft> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/assessment-builder/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  },

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    fieldId?: string;
    /** Assigned tab: assessors get their review assignments, staff get in-use assessments. */
    assigned?: boolean;
  }): Promise<PaginatedResponse<Assessment>> {
    const { data } = await api.get('/assessment-builder', { params });
    return data;
  },

  async getById(id: string): Promise<Assessment> {
    const { data } = await api.get(`/assessment-builder/${id}`);
    return data;
  },

  async create(input: CreateAssessmentInput): Promise<Assessment> {
    const { data } = await api.post('/assessment-builder', input);
    return data;
  },

  async update(id: string, input: UpdateAssessmentInput): Promise<Assessment> {
    const { data } = await api.put(`/assessment-builder/${id}`, input);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/assessment-builder/${id}`);
  },

  async publish(id: string): Promise<Assessment> {
    const { data } = await api.put(`/assessment-builder/${id}/publish`);
    return data;
  },

  async archive(id: string): Promise<Assessment> {
    const { data } = await api.put(`/assessment-builder/${id}/archive`);
    return data;
  },

  // ── Tasks ────────────────────────────────────

  async addTask(assessmentId: string, input: Partial<AssessmentTask>): Promise<AssessmentTask> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/tasks`, input);
    return data;
  },

  async updateTask(taskId: string, input: Partial<AssessmentTask>): Promise<AssessmentTask> {
    const { data } = await api.put(`/assessment-builder/tasks/${taskId}`, input);
    return data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/assessment-builder/tasks/${taskId}`);
  },

  async reorderTasks(assessmentId: string, orderedIds: string[]): Promise<void> {
    await api.put(`/assessment-builder/${assessmentId}/tasks/reorder`, { orderedIds });
  },

  // ── Checklist Items ──────────────────────────

  async addChecklistItem(
    assessmentId: string,
    input: Partial<AssessmentChecklistItem>,
  ): Promise<AssessmentChecklistItem> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/checklist`, input);
    return data;
  },

  async updateChecklistItem(
    itemId: string,
    input: Partial<AssessmentChecklistItem>,
  ): Promise<AssessmentChecklistItem> {
    const { data } = await api.put(`/assessment-builder/checklist/${itemId}`, input);
    return data;
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    await api.delete(`/assessment-builder/checklist/${itemId}`);
  },

  /** Downloads the checklist as a printable marking-sheet PDF (blob). */
  async downloadChecklistPdf(assessmentId: string): Promise<Blob> {
    const { data } = await api.get(`/assessment-builder/${assessmentId}/checklist/export`, {
      responseType: 'blob',
    });
    return data;
  },

  // ── Auto-Configuration (Analyze & Configure) ──

  /**
   * Analyzes the assessment (field, scenario, tasks, checklist, competencies)
   * and returns a reviewable draft — nothing is persisted.
   */
  async analyzeAssessment(assessmentId: string): Promise<AutoConfigDraft> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/analyze`);
    return data;
  },

  /**
   * Persists a reviewed auto-configuration draft, atomically replacing the
   * assessment's existing evidence, AI rules, oral questions and workspace
   * assignments with exactly what the assessor approved.
   */
  async applyAutoConfig(assessmentId: string, payload: ApplyAutoConfigPayload): Promise<Assessment> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/auto-configure`, payload);
    return data;
  },

  // ── Evidence Requirements ────────────────────

  async addEvidenceRequirement(
    assessmentId: string,
    input: Partial<EvidenceRequirement>,
  ): Promise<EvidenceRequirement> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/evidence`, input);
    return data;
  },

  async deleteEvidenceRequirement(evidenceId: string): Promise<void> {
    await api.delete(`/assessment-builder/evidence/${evidenceId}`);
  },

  // ── AI Evaluation Rules ──────────────────────

  async addAiRule(
    assessmentId: string,
    input: Partial<AiEvaluationRule>,
  ): Promise<AiEvaluationRule> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/ai-rules`, input);
    return data;
  },

  async updateAiRule(ruleId: string, input: Partial<AiEvaluationRule>): Promise<AiEvaluationRule> {
    const { data } = await api.put(`/assessment-builder/ai-rules/${ruleId}`, input);
    return data;
  },

  async deleteAiRule(ruleId: string): Promise<void> {
    await api.delete(`/assessment-builder/ai-rules/${ruleId}`);
  },

  // ── Oral Defense Questions ───────────────────

  async addOralQuestion(
    assessmentId: string,
    input: Partial<OralDefenseQuestion>,
  ): Promise<OralDefenseQuestion> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/oral-questions`, input);
    return data;
  },

  async deleteOralQuestion(questionId: string): Promise<void> {
    await api.delete(`/assessment-builder/oral-questions/${questionId}`);
  },

  // ── Workspace Modules ────────────────────────

  async listWorkspaceModules(): Promise<WorkspaceModule[]> {
    const { data } = await api.get('/assessment-builder/workspace-modules');
    return data;
  },

  async assignWorkspaceModule(
    assessmentId: string,
    workspaceModuleId: string,
    orderIndex?: number,
  ): Promise<void> {
    await api.post('/assessment-builder/workspace-modules/assign', {
      assessmentId,
      workspaceModuleId,
      orderIndex,
    });
  },

  async removeWorkspaceModule(assessmentId: string, workspaceModuleId: string): Promise<void> {
    await api.delete(`/assessment-builder/workspace-modules/${assessmentId}/${workspaceModuleId}`);
  },

  // ── Submissions (for AI Evaluation) ─────────

  async listSubmissions(assessmentId: string): Promise<SubmissionSummary[]> {
    const { data } = await api.get(`/assessment-builder/${assessmentId}/submissions`);
    return data;
  },

  // ── Enrollments ───────────────────────────────

  async listEnrollments(assessmentId: string, params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<Enrollment>> {
    const { data } = await api.get(`/assessment-builder/${assessmentId}/enrollments`, { params });
    return data;
  },

  async bulkEnroll(assessmentId: string, candidateIds: string[]): Promise<BulkEnrollResult> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/enrollments`, { candidateIds });
    return data;
  },

  async removeEnrollment(assessmentId: string, candidateId: string): Promise<void> {
    await api.delete(`/assessment-builder/${assessmentId}/enrollments/${candidateId}`);
  },

  async listAvailableCandidates(assessmentId: string, organizationId: string): Promise<any[]> {
    const { data } = await api.get(`/assessment-builder/${assessmentId}/enrollments/available/${organizationId}`);
    return data;
  },

  async enrollAllFromOrganization(assessmentId: string, organizationId: string): Promise<BulkEnrollResult> {
    const { data } = await api.post(`/assessment-builder/${assessmentId}/enrollments/enroll-all`, { organizationId });
    return data;
  },
};

// ── Submission Summary Type ─────────────────

export interface SubmissionSummary {
  id: string;
  examRegistrationId: string;
  examId: string;
  candidateId: string;
  submissionType: string;
  status: string;
  aiScore: number | null;
  finalScore: number | null;
  createdAt: string;
  submittedAt: string | null;
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
  };
  registration?: {
    id: string;
    status: string;
    totalScore: number | null;
  };
  files?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
  }>;
}

export default assessmentBuilderApi;
