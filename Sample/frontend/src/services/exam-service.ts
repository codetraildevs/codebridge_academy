import { api } from './api';
import type { ApiResponse, PaginationMeta, Exam, ExamSection, Question, RubricCriterion } from '@app_types/index';

// ── Input Types ────────────────────────────────────

export interface CreateExamInput {
  title: string;
  description?: string;
  tradeId: string;
  examType: 'PRACTICAL' | 'THEORETICAL' | 'MIXED';
  duration: number;
  passingScore?: number;
  maxAttempts?: number;
  instructions?: string;
  allowOralDefense?: boolean;
  requireFullScreen?: boolean;
  requireWebcam?: boolean;
  /** Tools provisioned in the candidate's practical workspace; empty = all tools */
  workspaceTools?: string[];
  /** Tools the platform owner locked — candidates cannot turn these off */
  lockedWorkspaceTools?: string[];
  startAt?: string;
  endAt?: string;
}

export interface CreateSectionInput {
  title: string;
  description?: string;
  orderIndex: number;
  sectionType: string;
  weight: number;
  duration?: number;
}

export interface CreateQuestionInput {
  sectionId: string;
  questionText: string;
  questionType: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  points: number;
  orderIndex: number;
  expectedOutput?: string;
}

// ── Service ────────────────────────────────────────

const EXAM_BASE = '/exams';

export const examService = {
  // ── Create Exam ──────────────────────────────
  async create(data: CreateExamInput): Promise<Exam> {
    const response = await api.post<ApiResponse<Exam>>(EXAM_BASE, data);
    return response.data.data;
  },

  // ── Get Exam by ID ───────────────────────────
  async getById(examId: string): Promise<Exam> {
    const response = await api.get<ApiResponse<Exam>>(`${EXAM_BASE}/${examId}`);
    return response.data.data;
  },

  // ── List Exams ───────────────────────────────
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    examType?: string;
    tradeId?: string;
  }): Promise<{ data: Exam[]; meta: PaginationMeta }> {
    const response = await api.get<ApiResponse<Exam[]> & { meta: PaginationMeta }>(EXAM_BASE, { params });
    return { data: response.data.data, meta: response.data.meta! };
  },

  // ── Update Exam ──────────────────────────────
  async update(examId: string, data: Partial<CreateExamInput & { status: string }>): Promise<Exam> {
    const response = await api.put<ApiResponse<Exam>>(`${EXAM_BASE}/${examId}`, data);
    return response.data.data;
  },

  // ── Publish Exam ─────────────────────────────
  async publish(examId: string): Promise<Exam> {
    const response = await api.post<ApiResponse<Exam>>(`${EXAM_BASE}/${examId}/publish`);
    return response.data.data;
  },

  // ── Archive Exam ─────────────────────────────
  async archive(examId: string): Promise<Exam> {
    const response = await api.post<ApiResponse<Exam>>(`${EXAM_BASE}/${examId}/archive`);
    return response.data.data;
  },

  // ── Create Section ───────────────────────────
  async createSection(examId: string, data: {
    title: string;
    description?: string;
    orderIndex: number;
    sectionType: string;
    weight: number;
    duration?: number;
  }): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`${EXAM_BASE}/${examId}/sections`, data);
    return response.data.data;
  },

  // ── Create Question ──────────────────────────
  async createQuestion(sectionId: string, data: {
    questionText: string;
    questionType: string;
    points: number;
    orderIndex: number;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswer?: string;
    expectedOutput?: string;
  }): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`${EXAM_BASE}/sections/${sectionId}/questions`, data);
    return response.data.data;
  },

  // ── Create Rubric Criterion (assessment checklist row) ──
  async createRubricCriterion(sectionId: string, data: {
    criterionName: string;
    description?: string;
    maxScore: number;
    weight?: number;
  }): Promise<any> {
    const response = await api.post<ApiResponse<any>>(
      `${EXAM_BASE}/sections/${sectionId}/rubric-criteria`,
      data,
    );
    return response.data.data;
  },

  // ── Update Section ─────────────────────────────
  async updateSection(sectionId: string, data: {
    title?: string;
    description?: string | null;
    orderIndex?: number;
    sectionType?: string;
    weight?: number;
    duration?: number | null;
  }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`${EXAM_BASE}/sections/${sectionId}`, data);
    return response.data.data;
  },

  // ── Delete Section ─────────────────────────────
  async deleteSection(sectionId: string): Promise<any> {
    const response = await api.delete<ApiResponse<any>>(`${EXAM_BASE}/sections/${sectionId}`);
    return response.data.data;
  },

  // ── Update Question (task) ─────────────────────
  async updateQuestion(questionId: string, data: {
    questionText?: string;
    questionType?: string;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswer?: string | null;
    points?: number;
    orderIndex?: number;
    expectedOutput?: string | null;
  }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`${EXAM_BASE}/questions/${questionId}`, data);
    return response.data.data;
  },

  // ── Delete Question (task) ─────────────────────
  async deleteQuestion(questionId: string): Promise<any> {
    const response = await api.delete<ApiResponse<any>>(`${EXAM_BASE}/questions/${questionId}`);
    return response.data.data;
  },

  // ── Update Rubric Criterion (checklist row) ───
  async updateRubricCriterion(criterionId: string, data: {
    criterionName?: string;
    description?: string | null;
    maxScore?: number;
    weight?: number;
  }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`${EXAM_BASE}/rubric-criteria/${criterionId}`, data);
    return response.data.data;
  },

  // ── Delete Rubric Criterion (checklist row) ───
  async deleteRubricCriterion(criterionId: string): Promise<any> {
    const response = await api.delete<ApiResponse<any>>(`${EXAM_BASE}/rubric-criteria/${criterionId}`);
    return response.data.data;
  },

  // ── Register Individual Candidate ────────────
  async registerCandidate(examId: string, candidateId: string): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`${EXAM_BASE}/${examId}/register-candidate`, { candidateId });
    return response.data.data;
  },

  // ── Get Exam Registrations ───────────────────
  async getRegistrations(examId: string, params?: { page?: number; limit?: number }): Promise<{ data: any[]; meta: PaginationMeta }> {
    const response = await api.get<ApiResponse<any[]> & { meta: PaginationMeta }>(
      `${EXAM_BASE}/${examId}/registrations`,
      { params },
    );
    return { data: response.data.data, meta: response.data.meta! };
  },

  // ── List Individual Candidates (no org) ───────
  async getIndividualCandidates(search?: string): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>(`${EXAM_BASE}/candidates/individual`, {
      params: search ? { search } : undefined,
    });
    return response.data.data;
  },

  // ── Import: Upload Document & Parse ────────────
  async uploadAndParse(
    file: File,
    tradeId?: string,
    onProgress?: (percent: number) => void,
  ): Promise<{
    fileName: string;
    fileSize: number;
    extractedTextLength: number;
    parsedData: ParsedExamData;
  }> {
    const formData = new FormData();
    formData.append('document', file);
    if (tradeId) formData.append('tradeId', tradeId);

    const response = await api.post<
      ApiResponse<{
        fileName: string;
        fileSize: number;
        extractedTextLength: number;
        parsedData: ParsedExamData;
      }>
    >(`${EXAM_BASE}/import/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data.data;
  },

  // ── Import: Confirm & Create Exam ──────────────
  async confirmImport(
    parsedData: ParsedExamData,
    tradeId?: string,
    workspaceTools?: string[],
    lockedWorkspaceTools?: string[],
  ): Promise<{
    exam: { id: string; title: string; status: string };
    stats: { sectionsCreated: number; questionsCreated: number; rubricCriteriaCreated: number };
  }> {
    const response = await api.post<
      ApiResponse<{
        exam: { id: string; title: string; status: string };
        stats: { sectionsCreated: number; questionsCreated: number; rubricCriteriaCreated: number };
      }>
    >(`${EXAM_BASE}/import/confirm`, { parsedData, tradeId, workspaceTools, lockedWorkspaceTools });
    return response.data.data;
  },
};

export interface ParsedRubricCriterion {
  criterionName: string;
  description?: string;
  maxScore: number;
  weight?: number;
}

export interface ParsedExamData {
  title: string;
  description?: string;
  examType: 'PRACTICAL' | 'THEORETICAL' | 'MIXED';
  duration: number;
  passingScore?: number;
  maxAttempts?: number;
  instructions?: string;
  sections: {
    title: string;
    description?: string;
    sectionType: string;
    weight?: number;
    duration?: number;
    /** Assessment checklist / rubric criteria extracted from document tables */
    rubricCriteria?: ParsedRubricCriterion[];
    questions: {
      questionText: string;
      questionType: string;
      /** Imported tasks carry NO marks (always 0) — marks live on the assessment checklist rubric criteria */
      points?: number;
      options?: Array<{ text: string; isCorrect: boolean }>;
      expectedOutput?: string;
    }[];
  }[];
}

export default examService;
