// ── Permission Types ───────────────────────────
// These types reflect the DB schema (permissions + role_permissions tables).
// Permission names follow the convention {module}:{action}.

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
}

export interface PermissionResponse {
  success: boolean;
  data: Permission[];
}

// ── Convenience Permission Names ───────────────
// Used as constants so the compiler catches typos.

export const Permissions = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',

  // Organizations
  ORGANIZATIONS_VIEW: 'organizations:view',
  ORGANIZATIONS_CREATE: 'organizations:create',
  ORGANIZATIONS_MANAGE: 'organizations:manage',

  // Users
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',

  // Exams
  EXAMS_VIEW: 'exams:view',
  EXAMS_CREATE: 'exams:create',
  EXAMS_MANAGE: 'exams:manage',

  // Assessments
  ASSESSMENTS_VIEW: 'assessments:view',
  ASSESSMENTS_ASSESS: 'assessments:assess',

  // Candidates
  CANDIDATES_VIEW: 'candidates:view',
  CANDIDATES_MANAGE: 'candidates:manage',

  // Interviews
  INTERVIEWS_VIEW: 'interviews:view',
  INTERVIEWS_CONDUCT: 'interviews:conduct',

  // Reports
  REPORTS_VIEW: 'reports:view',

  // Certificates
  CERTIFICATES_VIEW: 'certificates:view',
  CERTIFICATES_ISSUE: 'certificates:issue',

  // Settings
  SETTINGS_VIEW: 'settings:view',

  // Billing / Plans
  PLANS_MANAGE: 'plans:manage',

  // AI
  AI_CONFIGURE: 'ai:configure',

  // Audit
  AUDIT_VIEW: 'audit:view',
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];
