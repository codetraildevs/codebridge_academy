// ─────────────────────────────────────────────────────────────
//  Centralized navigation configuration
//
//  ONE reusable sidebar is driven entirely by this config.
//  Navigation is organized by FUNCTION (group) — not by user
//  role — and each item declares:
//
//    roles:      allowed user roles (primary visibility gate,
//                on both groups and items)
//    permission: required backend permission (secondary gate,
//                enforced whenever permission data is loaded)
//    comingSoon: the item is listed in fix_sidebar.md for this
//                role but has NO page in the app yet — it still
//                renders (visible, disabled, "Soon" badge) so the
//                menu structure matches the spec exactly instead
//                of silently dropping items.
//
//  The group names, per-role membership, item labels and ordering
  //  mirror fix_sidebar.md verbatim. Every item the spec lists now
  //  has a page. Any future spec item without a route can be added
  //  with `comingSoon: true` to render it visible-but-disabled with
  //  a "Soon" badge instead of silently dropping it.
//
//  Three deliberate decisions worth noting:
//  - DESIGNER "Assessment Configuration" (Checklist, Evidence
//    Requirements, Workspace Configuration, Rubrics & Marking, AI
//    Evaluation Rules, Oral Defense) is NOT a top-level group: the
//    spec's own note says these belong inside the Assessment
//    Builder workflow (rule 9: Basic Information, Scenario, Tasks,
//    Competencies, Checklist, Evidence, Workspace, Rubrics, AI
//    Rules, Oral Defense, Review, Publish), not as sidebar menus.
//  - "Interviews" is not listed for any role in fix_sidebar.md, so
//    it is not in the sidebar (the page stays reachable by URL).
//  - Status-tab items (Draft / Published Assessments) appear only
//    for the DESIGNER, exactly as the spec's Assessments sections
//    list them.
//
//  Backend permissions remain the real security layer. Hiding a
//  menu item here is NOT security — the API must reject any
//  unauthorized request regardless of what the sidebar shows.
// ─────────────────────────────────────────────────────────────
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Brain,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Cog,
  CreditCard,
  FileBarChart,
  FileCheck,
  FileStack,
  FolderCheck,
  Gauge,
  GraduationCap,
  History,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ListTree,
  Lock,
  Mic,
  PenLine,
  Play,
  Plus,
  Puzzle,
  ScanSearch,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trophy,
  UploadCloud,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Permissions, type PermissionName } from '../types/permissions';

export interface NavItem {
  label: string;
  /** Destination route. Absent for `comingSoon` items (not navigable yet). */
  to?: string;
  icon: LucideIcon;
  /** Allowed roles. Omit to allow every authenticated role. */
  roles?: string[];
  /** Required permission, enforced when permission data is loaded. */
  permission?: PermissionName;
  /** Exact-match active state (keeps parent links from staying active on child routes). */
  end?: boolean;
  /** Listed in fix_sidebar.md but not implemented yet — renders disabled with a "Soon" badge. */
  comingSoon?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Roles that may see this group at all. Omit = every authenticated role. */
  roles?: string[];
  items: NavItem[];
}

// ── Shared helpers ─────────────────────────────

/** Staff roles allowed to create/import assessments (matches the backend role gate). */
const ASSESSMENT_AUTHOR_ROLES = ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'DESIGNER'];

/** The evaluation groups listed in fix_sidebar.md (PO + org admin + assessor). */
const EVALUATION_ROLES = ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ASSESSOR', 'ORGANIZATION_REVIEWER'];

export const NAV_GROUPS: NavGroup[] = [
  // ── Dashboard (everyone) ──────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        permission: Permissions.DASHBOARD_VIEW,
      },
    ],
  },

  // ── Organization Management (platform owner) ──
  {
    id: 'organization-management',
    label: 'Organization Management',
    icon: Building2,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'Organizations',
        to: '/organizations',
        icon: Building2,
        permission: Permissions.ORGANIZATIONS_VIEW,
      },
      {
        label: 'Organization Users',
        to: '/users',
        icon: UserCog,
      },
    ],
  },

  // ── My Organization (org admins) ──────────────
  {
    id: 'my-organization',
    label: 'My Organization',
    icon: Building2,
    roles: ['ORGANIZATION_OWNER', 'ADMIN'],
    items: [
      {
        label: 'Organization Overview',
        to: '/organization-overview',
        icon: Landmark,
      },
      {
        label: 'Organization Users',
        to: '/users',
        icon: UserCog,
      },
      {
        label: 'Organization Settings',
        to: '/settings',
        icon: Settings,
        end: true,
      },
    ],
  },

  // ── People (platform owner, org admins, org reviewers) ──
  // Candidates is where candidate accounts live; Users & Roles (per
  // fix_sidebar.md) is the org-user management page — reachable by the
  // platform owner and org managers. The platform owner scopes new users to
  // any org; org managers are confined to their own org and cannot create an
  // organization or a PLATFORM_OWNER account (both enforced by the API).
  {
    id: 'people',
    label: 'People',
    icon: Users,
    roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ORGANIZATION_REVIEWER'],
    items: [
      {
        label: 'Candidates',
        to: '/candidates',
        icon: Users,
        roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ORGANIZATION_REVIEWER'],
        permission: Permissions.CANDIDATES_VIEW,
      },
      {
        label: 'Assessors',
        to: '/assessors',
        icon: UserCheck,
        roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN'],
      },
      {
        label: 'Users & Roles',
        to: '/users',
        icon: UserCog,
        roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN'],
      },
    ],
  },

  // ── Assessments (platform owner, org admins, org reviewers) ──
  // Status-tab items (Draft / Published) are listed in fix_sidebar.md for the
  // DESIGNER only — this staff group keeps the spec's PO / org-admin list.
  {
    id: 'assessments',
    label: 'Assessments',
    icon: GraduationCap,
    roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ORGANIZATION_REVIEWER'],
    items: [
      {
        label: 'All Assessments',
        to: '/assessments',
        icon: FileCheck,
        roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ORGANIZATION_REVIEWER'],
        permission: Permissions.ASSESSMENTS_VIEW,
        end: true,
      },

      {
        label: 'Assessment Builder',
        to: '/assessment-builder',
        icon: Puzzle,
        roles: ASSESSMENT_AUTHOR_ROLES,
        permission: Permissions.ASSESSMENTS_VIEW,
      },
      {
        label: 'Assessment Templates',
        to: '/assessment-templates',
        icon: FileStack,
        roles: ASSESSMENT_AUTHOR_ROLES,
      },
      {
        label: 'Assessment Sessions',
        to: '/exams',
        icon: ClipboardList,
        roles: ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN', 'ORGANIZATION_REVIEWER'],
      },
    ],
  },

  // ── Assessments (designer) ────────────────────
  // The spec's designer list: My / Create / Import / Builder / Templates /
  // Draft / Published. (Assessment Configuration stays inside the builder —
  // see the header comment.)
  {
    id: 'assessments-designer',
    label: 'Assessments',
    icon: GraduationCap,
    roles: ['DESIGNER'],
    items: [
      {
        label: 'My Assessments',
        to: '/assessments',
        icon: FileCheck,
        permission: Permissions.ASSESSMENTS_VIEW,
        end: true,
      },

      {
        label: 'Assessment Builder',
        to: '/assessment-builder',
        icon: Puzzle,
        permission: Permissions.ASSESSMENTS_VIEW,
      },
      {
        label: 'Assessment Templates',
        to: '/assessment-templates',
        icon: FileStack,
      },

    ],
  },

  // ── My Assessments (assessor) ─────────────────
  {
    id: 'my-assessments',
    label: 'My Assessments',
    icon: GraduationCap,
    roles: ['ASSESSOR'],
    items: [
      {
        label: 'Assigned Assessments',
        to: '/assessments?status=assigned',
        icon: ClipboardCheck,
        end: true,
      },
      {
        label: 'Assessment Sessions',
        to: '/exams',
        icon: ClipboardList,
      },
      {
        label: 'Candidates',
        to: '/candidates',
        icon: Users,
        permission: Permissions.CANDIDATES_VIEW,
      },
    ],
  },

  // ── My Assessments (candidate) ────────────────
  // Each item deep-links to a tab on the candidate portal (?tab=…) so the
  // candidate always lands on the view they clicked. fix_sidebar.md's "Active"
  // and "History" map to the portal's IN_PROGRESS and COMPLETED filters.
  {
    id: 'candidate-assessments',
    label: 'My Assessments',
    icon: GraduationCap,
    roles: ['CANDIDATE', 'INDIVIDUAL_CANDIDATE'],
    items: [
      {
        label: 'Available Assessments',
        to: '/candidate-portal?tab=available',
        icon: BookOpen,
      },
      {
        label: 'My Assessments',
        to: '/candidate-portal',
        icon: GraduationCap,
        end: true,
      },
      {
        label: 'Active Assessments',
        to: '/candidate-portal?tab=active',
        icon: Play,
      },
      {
        label: 'Assessment History',
        to: '/candidate-portal?tab=history',
        icon: History,
      },
    ],
  },

  // ── Evaluation (PO, org admins, assessors, org reviewers) ──
  // fix_sidebar.md lists AI Evaluation + Manual Evaluation for PO and
  // assessors only; org admins get the rest.
  {
    id: 'evaluation',
    label: 'Evaluation',
    icon: ClipboardCheck,
    roles: EVALUATION_ROLES,
    items: [
      {
        label: 'Candidate Submissions',
        to: '/assessor-review',
        icon: ClipboardCheck,
      },
      {
        label: 'Evidence',
        to: '/evidence',
        icon: FolderCheck,
      },
      {
        label: 'Assessment Checklist',
        to: '/assessment-checklist',
        icon: ListChecks,
      },
      {
        label: 'AI Evaluation',
        to: '/ai-evaluation',
        icon: ScanSearch,
        roles: ['PLATFORM_OWNER', 'ASSESSOR'],
      },
      {
        label: 'Manual Evaluation',
        to: '/manual-evaluation',
        icon: PenLine,
        roles: ['PLATFORM_OWNER', 'ASSESSOR'],
      },
      {
        label: 'Oral Defense',
        to: '/oral-defense',
        icon: Mic,
      },
      {
        label: 'Results',
        to: '/results',
        icon: Award,
      },
    ],
  },

  // ── Workspace (platform owner) ─────────────────
  {
    id: 'workspace',
    label: 'Workspace',
    icon: Boxes,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'Workspace Modules',
        to: '/workspace',
        icon: Boxes,
        end: true,
      },
      {
        label: 'Workspace Configuration',
        to: '/workspace?view=configuration',
        icon: SlidersHorizontal,
        end: true,
      },
    ],
  },

  // ── AI & Automation (platform owner) ──────────
  {
    id: 'ai',
    label: 'AI & Automation',
    icon: Brain,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'AI Configuration',
        to: '/ai-config',
        icon: Brain,
        permission: Permissions.AI_CONFIGURE,
      },
      {
        label: 'AI Evaluation Rules',
        to: '/ai-rules',
        icon: Bot,
      },
      {
        label: 'AI Question Generation',
        to: '/ai-generation',
        icon: Sparkles,
      },
    ],
  },

  // ── AI & Automation (designer) ────────────────
  // AI Configuration is permission-gated on ai:configure; seeded designers
  // do not hold it, so only the (coming soon) AI Generation item shows for
  // them. The group collapses to a single disabled row in that case.
  {
    id: 'ai-designer',
    label: 'AI & Automation',
    icon: Brain,
    roles: ['DESIGNER'],
    items: [
      {
        label: 'AI Generation',
        to: '/ai-generation',
        icon: Sparkles,
      },
      {
        label: 'AI Configuration',
        to: '/ai-config',
        icon: Brain,
        permission: Permissions.AI_CONFIGURE,
      },
    ],
  },

  // ── Reports & Analytics (platform owner) ──────
  {
    id: 'reports-analytics',
    label: 'Reports & Analytics',
    icon: BarChart3,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'Assessment Reports',
        to: '/reports',
        icon: BarChart3,
      },
      {
        label: 'Candidate Reports',
        to: '/reports?view=candidates',
        icon: FileBarChart,
      },
      {
        label: 'Organization Reports',
        to: '/reports?view=organizations',
        icon: Landmark,
      },
      {
        label: 'Assessor Reports',
        to: '/reports?view=assessors',
        icon: UserCheck,
      },
      {
        label: 'Performance Analytics',
        to: '/reports?view=performance',
        icon: TrendingUp,
      },
    ],
  },

  // ── Reports (org admins, designers, assessors, org reviewers) ──
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['ORGANIZATION_OWNER', 'ADMIN', 'DESIGNER', 'ASSESSOR', 'ORGANIZATION_REVIEWER'],
    items: [
      {
        label: 'Assessment Reports',
        to: '/reports',
        icon: BarChart3,
      },
      {
        label: 'Candidate Reports',
        to: '/reports?view=candidates',
        icon: FileBarChart,
        roles: ['ORGANIZATION_OWNER', 'ADMIN'],
      },
      {
        label: 'Performance Analytics',
        to: '/reports?view=performance',
        icon: TrendingUp,
        roles: ['ORGANIZATION_OWNER', 'ADMIN'],
      },
      {
        label: 'Candidate Results',
        to: '/candidate-results',
        icon: Award,
        roles: ['ASSESSOR'],
      },
    ],
  },

  // ── Subscriptions (platform owner) ────────────
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: CreditCard,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'Subscription Plans',
        to: '/settings/plans',
        icon: CreditCard,
        permission: Permissions.PLANS_MANAGE,
      },
      {
        label: 'Organization Subscriptions',
        to: '/subscriptions',
        icon: Landmark,
        end: true,
      },
      {
        label: 'User Subscriptions',
        to: '/subscriptions/users',
        icon: UserCog,
        end: true,
      },
      {
        label: 'Payments',
        to: '/payments',
        icon: Wallet,
        end: true,
      },
      {
        label: 'Payment History',
        to: '/payments/history',
        icon: History,
        end: true,
      },
      {
        label: 'Usage',
        to: '/usage',
        icon: Gauge,
      },
    ],
  },

  // ── Subscription (org admins) ─────────────────
  {
    id: 'subscription',
    label: 'Subscription',
    icon: CreditCard,
    roles: ['ORGANIZATION_OWNER', 'ADMIN'],
    items: [
      {
        label: 'My Subscription',
        to: '/settings/plans',
        icon: CreditCard,
      },
      {
        label: 'Billing',
        to: '/billing',
        icon: Wallet,
      },
      {
        label: 'Usage',
        to: '/usage',
        icon: Gauge,
      },
    ],
  },

  // ── Administration (platform owner) ───────────
  {
    id: 'administration',
    label: 'Administration',
    icon: Shield,
    roles: ['PLATFORM_OWNER'],
    items: [
      {
        label: 'System Configuration',
        to: '/system-config',
        icon: Cog,
      },
      {
        label: 'Audit Logs',
        to: '/audit-logs',
        icon: ScrollText,
        permission: Permissions.AUDIT_VIEW,
      },
      {
        label: 'Security',
        to: '/security',
        icon: Lock,
      },
      {
        label: 'Notifications',
        to: '/notifications',
        icon: Bell,
      },
    ],
  },

  // ── My Work (candidate) ───────────────────────
  {
    id: 'my-work',
    label: 'My Work',
    icon: ClipboardList,
    roles: ['CANDIDATE', 'INDIVIDUAL_CANDIDATE'],
    items: [
      {
        label: 'My Workspace',
        to: '/my-workspace',
        icon: Boxes,
      },
      {
        label: 'My Tasks',
        to: '/my-tasks',
        icon: ListTree,
      },
      {
        label: 'My Submissions',
        to: '/candidate-portal/submissions',
        icon: FileCheck,
      },
      {
        label: 'My Evidence',
        to: '/my-evidence',
        icon: FolderCheck,
      },
    ],
  },

  // ── Oral Defense (candidate) ──────────────────
  {
    id: 'oral-defense',
    label: 'Oral Defense',
    icon: Mic,
    roles: ['CANDIDATE', 'INDIVIDUAL_CANDIDATE'],
    items: [
      {
        label: 'Oral Defense',
        to: '/candidate-oral-defense',
        icon: Mic,
      },
      {
        label: 'Defense History',
        to: '/defense-history',
        icon: History,
      },
    ],
  },

  // ── Results (candidate) ───────────────────────
  // "My Results" deep-links to the submissions list filtered to completed
  // assessments (?status=completed) where final scores are shown.
  {
    id: 'results',
    label: 'Results',
    icon: Award,
    roles: ['CANDIDATE', 'INDIVIDUAL_CANDIDATE'],
    items: [
      {
        label: 'My Results',
        to: '/candidate-portal/submissions?status=completed',
        icon: Trophy,
      },
      {
        label: 'Certificates',
        to: '/certificates',
        icon: Award,
      },
    ],
  },

  // ── Settings (everyone) ──────────────────────────────────────
  // Single direct link to the Settings > Appearance page so users
  // land directly on theme selection. All other settings sub-pages
  // are reachable via the tab bar inside the settings layout.
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      {
        label: 'Settings',
        to: '/settings/appearance',
        icon: Settings,
        end: true,
      },
    ],
  },
];

export default NAV_GROUPS;
