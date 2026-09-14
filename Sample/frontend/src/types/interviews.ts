// ── Interview Types ───────────────────────────

export type InterviewType = 'STRUCTURED_QA' | 'LIVE_CODING' | 'SYSTEM_DESIGN' | 'CASE_STUDY' | 'WHITEBOARD';
export type InterviewStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type InterviewDifficulty = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
export type InterviewSectionType = 'TECHNICAL_QA' | 'CODING_CHALLENGE' | 'SYSTEM_DESIGN' | 'CASE_STUDY' | 'BEHAVIORAL' | 'GENERAL';
export type InterviewQuestionType = 'TEXT' | 'CODE' | 'FILE_UPLOAD' | 'MULTIPLE_CHOICE';

// ── Template Types ─────────────────────────────

export interface InterviewTemplate {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: number;
  totalScore: number;
  status: InterviewStatus;
  instructions: string | null;
  sections?: InterviewTemplateSection[];
  sectionsCount?: number;
  organization?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTemplateSection {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  sectionType: InterviewSectionType;
  weight: number;
  duration: number | null;
  questions?: InterviewTemplateQuestion[];
  criteria?: InterviewCriterion[];
  createdAt: string;
}

export interface InterviewTemplateQuestion {
  id: string;
  sectionId: string;
  questionText: string;
  questionType: InterviewQuestionType;
  points: number;
  orderIndex: number;
  expectedAnswer: string | null;
  hints: string | null;
  createdAt: string;
}

export interface InterviewCriterion {
  id: string;
  sectionId: string;
  criterionName: string;
  description: string | null;
  maxScore: number;
  weight: number;
  createdAt: string;
}

// ── Interview Instance Types ───────────────────

export interface TechnicalInterview {
  id: string;
  jobApplicationId: string;
  templateId: string;
  interviewerId: string | null;
  interviewer?: { id: string; firstName: string; lastName: string; email: string } | null;
  status: InterviewStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  interviewerNotes: string | null;
  candidateName?: string;
  jobTitle?: string;
  templateTitle?: string;
  template?: InterviewTemplate;
  responses?: InterviewResponse[];
  application?: {
    candidate: { id: string; firstName: string; lastName: string; email: string };
    posting: { title: string; organization: { name: string } };
  };
  createdAt: string;
  updatedAt: string;
}

export interface InterviewResponse {
  id: string;
  interviewId: string;
  questionId: string;
  question?: { id: string; questionText: string; questionType: InterviewQuestionType; points: number; orderIndex: number };
  responseText: string | null;
  responseCode: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  evaluatedBy: string | null;
  evaluator?: { id: string; firstName: string; lastName: string } | null;
  evaluatedAt: string | null;
  createdAt: string;
}

// ── Form Types ─────────────────────────────────

export interface CreateTemplateFormData {
  title: string;
  description?: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  duration: number;
  totalScore?: number;
  instructions?: string;
  sections?: CreateTemplateSectionData[];
}

export interface CreateTemplateSectionData {
  title: string;
  description?: string;
  orderIndex: number;
  sectionType: InterviewSectionType;
  weight: number;
  duration?: number;
  questions?: CreateTemplateQuestionData[];
  criteria?: CreateTemplateCriterionData[];
}

export interface CreateTemplateQuestionData {
  questionText: string;
  questionType: InterviewQuestionType;
  points: number;
  orderIndex: number;
  expectedAnswer?: string;
  hints?: string;
}

export interface CreateTemplateCriterionData {
  criterionName: string;
  description?: string;
  maxScore: number;
  weight: number;
}

export interface ScheduleInterviewFormData {
  jobApplicationId: string;
  templateId: string;
  interviewerId?: string;
  scheduledAt?: string;
}

// ── Color Maps ─────────────────────────────────

export const interviewTypeColors: Record<InterviewType, { label: string; color: string; bg: string }> = {
  STRUCTURED_QA: { label: 'Structured Q&A', color: 'text-blue-600', bg: 'bg-blue-50' },
  LIVE_CODING: { label: 'Live Coding', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SYSTEM_DESIGN: { label: 'System Design', color: 'text-purple-600', bg: 'bg-purple-50' },
  CASE_STUDY: { label: 'Case Study', color: 'text-amber-600', bg: 'bg-amber-50' },
  WHITEBOARD: { label: 'Whiteboard', color: 'text-rose-600', bg: 'bg-rose-50' },
};

export const interviewStatusColors: Record<InterviewStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600 bg-gray-100' },
  PUBLISHED: { label: 'Published', color: 'text-blue-600 bg-blue-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-600 bg-amber-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-emerald-600 bg-emerald-100' },
  COMPLETED: { label: 'Completed', color: 'text-green-700 bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600 bg-red-100' },
};

export const difficultyColors: Record<InterviewDifficulty, { label: string; color: string; bg: string }> = {
  JUNIOR: { label: 'Junior', color: 'text-green-600', bg: 'bg-green-50' },
  MID: { label: 'Mid-Level', color: 'text-blue-600', bg: 'bg-blue-50' },
  SENIOR: { label: 'Senior', color: 'text-purple-600', bg: 'bg-purple-50' },
  LEAD: { label: 'Lead', color: 'text-rose-600', bg: 'bg-rose-50' },
};

export const sectionTypeLabels: Record<InterviewSectionType, string> = {
  TECHNICAL_QA: 'Technical Q&A',
  CODING_CHALLENGE: 'Coding Challenge',
  SYSTEM_DESIGN: 'System Design',
  CASE_STUDY: 'Case Study',
  BEHAVIORAL: 'Behavioral',
  GENERAL: 'General',
};
