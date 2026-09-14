// ── API Response Types ─────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// ── Auth Types ─────────────────────────────────

export type UserRole =
  | 'PLATFORM_OWNER'
  | 'ORGANIZATION_OWNER'
  | 'ADMIN'
  | 'DESIGNER'
  | 'ASSESSOR'
  | 'ORGANIZATION_REVIEWER'
  | 'CANDIDATE'
  | 'INDIVIDUAL_CANDIDATE';

export type UserType = 'PLATFORM' | 'ORGANIZATION' | 'INDIVIDUAL';

export interface UserProfile {
  id: string;
  userType: UserType;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  phone?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  freeAssessmentsUsed: number;
  maxFreeAssessments: number;
  subscriptionStatus?: string | null;
  subscriptionEndAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterIndividualResponse {
  user: UserProfile;
  candidate: {
    id: string;
    registrationNumber: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterOrganizationResponse {
  user: UserProfile;
  organization: { id: string; name: string; code: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ── Trade Types ────────────────────────────────

export interface Trade {
  id: string;
  name: string;
  code: string;
  description?: string;
  iconUrl?: string | null;
  isActive: boolean;
  /** Default workspace environment for this trade's exams; empty = fall back to built-in defaults */
  workspaceTools?: string[];
  /** Tools the platform owner locked — candidates cannot turn these off */
  lockedWorkspaceTools?: string[];
  competencies?: Competency[];
  createdAt: string;
}

export interface Competency {
  id: string;
  name: string;
  description?: string;
  category: string;
  maxScore: number;
}

// ── Exam Types ─────────────────────────────────

export interface Exam {
  id: string;
  organizationId?: string | null;
  title: string;
  description?: string | null;
  tradeId: string;
  tradeName: string;
  tradeCode?: string;
  examType: 'PRACTICAL' | 'THEORETICAL' | 'MIXED';
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  duration: number;
  passingScore: number;
  maxAttempts: number;
  instructions?: string | null;
  allowOralDefense: boolean;
  requireFullScreen: boolean;
  requireWebcam: boolean;
  /** Tools provisioned in the candidate's practical workspace; empty = all tools */
  workspaceTools?: string[];
  /** Tools the platform owner locked — candidates cannot turn these off */
  lockedWorkspaceTools?: string[];
  startAt?: string | null;
  endAt?: string | null;
  sections?: ExamSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ExamSection {
  id: string;
  examId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  sectionType: SectionType;
  weight: number;
  duration?: number | null;
  questions?: Question[];
  /** Assessment checklist rows linked at the section level (questionId null). */
  rubricCriteria?: RubricCriterion[];
  createdAt: string;
}

export type SectionType =
  | 'ERD_DESIGN'
  | 'DFD_DESIGN'
  | 'FLOWCHART'
  | 'UML_DIAGRAM'
  | 'CODE_WRITING'
  | 'DATABASE_DESIGN'
  | 'TOPOLOGY_BUILDER'
  | 'NETWORK_CONFIG'
  | 'SUBNETTING'
  | 'PRESENTATION'
  | 'PORTFOLIO'
  | 'MULTIPLE_CHOICE'
  | 'ESSAY'
  | 'FILE_UPLOAD'
  | 'MIXED'
  | 'ENVIRONMENT_SETUP'
  | 'PROJECT_CLEANUP';

export interface Question {
  id: string;
  sectionId: string;
  questionText: string;
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY' | 'CODE' | 'DIAGRAM' | 'FILE_UPLOAD' | 'SHORT_ANSWER';
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string | null;
  points: number;
  orderIndex: number;
  expectedOutput?: string | null;
  rubricCriteria?: RubricCriterion[];
  createdAt: string;
}

export interface RubricCriterion {
  id: string;
  questionId?: string | null;
  sectionId?: string | null;
  criterionName: string;
  description?: string | null;
  maxScore: number;
  weight: number;
  levels?: Array<{
    level: number;
    label: string;
    description?: string;
    score: number;
  }>;
}

// ── Candidate Types ────────────────────────────

export type CandidateStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'GRADUATED';

export interface Candidate {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  tradeId?: string | null;
  tradeName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  status: CandidateStatus;
  enrollmentDate: string;
  createdAt: string;
}

// ── Organization Types ─────────────────────────

export type OrganizationType =
  | 'TVET_SCHOOL'
  | 'SECONDARY_SCHOOL'
  | 'UNIVERSITY'
  | 'COMPANY'
  | 'GOVERNMENT_INSTITUTION'
  | 'EXAMINATION_AUTHORITY'
  | 'CERTIFICATION_BODY'
  | 'NGO'
  | 'TRAINING_CENTER'
  | 'OTHER';

export type OrganizationSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'CANCELLED' | 'TRIAL';

export interface Organization {
  id: string;
  name: string;
  code: string;
  organizationType: OrganizationType;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
  isVerified: boolean;
  isActive: boolean;
  subscriptionPlanId?: string | null;
  subscriptionStatus: OrganizationSubscriptionStatus;
  maxUsers: number;
  maxCandidates: number;
  maxJobPostings: number;
  /** Candidate rows linked to the org (seats used) — present on list/detail responses. */
  totalCandidates?: number;
  trades?: Trade[];
  createdAt: string;
  updatedAt: string;
}

// ── Job Posting Types ──────────────────────────

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
export type JobApplicationStatus = 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';

export interface JobPosting {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  employmentType: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency: string;
  experienceLevel: ExperienceLevel;
  tradeId?: string | null;
  examId?: string | null;
  recruiterId?: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  maxApplicants: number;
  closedAt?: string | null;
  _count?: { applications: number };
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  jobPostingId: string;
  candidateId: string;
  status: JobApplicationStatus;
  recruiterNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  examRegistrationId?: string | null;
  overallScore?: number | null;
  appliedAt: string;
}

// ── Subscription Plan Types ────────────────────

export type PlanType = 'INDIVIDUAL' | 'ORGANIZATION';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'PER_EXAM';

export interface SubscriptionPlan {
  id: string;
  planType: PlanType;
  name: string;
  description?: string | null;
  price: number;
  pricePerExam?: number;
  currency: string;
  billingCycle: BillingCycle;
  durationDays: number;
  maxUsers: number;
  maxCandidates: number;
  maxAssessments: number;
  maxJobPostings: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}
