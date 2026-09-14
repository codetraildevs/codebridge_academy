import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@app/layouts/main-layout';
import { AuthLayout } from '@app/layouts/auth-layout';
import { ProtectedRoute } from '@components/auth/protected-route';
import { PermissionGuard } from '@components/auth/require-permission';
import { Permissions } from '../../types/permissions';
import { LandingPage } from '@pages/landing';
import { DashboardPage } from '@pages/dashboard';
import { LoginPage } from '@pages/auth/login';
import { RegisterPage } from '@pages/auth/register';
import { RegisterIndividualPage } from '@pages/auth/register-individual';
import { RegisterOrganizationPage } from '@pages/auth/register-organization';
import { ForgotPasswordPage } from '@pages/auth/forgot-password';
import { ExamsListPage } from '@pages/exams';
import { ExamDetailPage } from '@pages/exams/detail';
import { AssessmentsPage } from '@pages/assessments';
import { CandidatesPage } from '@pages/candidates';
import { ReportsPage } from '@pages/reports';
import { ResultsPage } from '@pages/results';
import { UsagePage } from '@pages/usage';
import { OrganizationSubscriptionsPage } from '@pages/subscriptions';
import { UserSubscriptionsPage } from '@pages/subscriptions/users';
import { SubscriptionHistoryPage } from '@pages/subscriptions/history';
import { PaymentsPage } from '@pages/payments';
import { PaymentHistoryPage } from '@pages/payments/history';
import { InstitutionsPage } from '@pages/institutions';
import { CertificatesPage } from '@pages/certificates';
import { SettingsLayout } from '@pages/settings/settings-layout';
import { AccountSettingsPage } from '@pages/settings/account';
import { SecuritySettingsPage } from '@pages/settings/security';
import { NotificationsSettingsPage } from '@pages/settings/notifications';
import { PlanManagementPage } from '@pages/settings/plans';
import { AppearanceSettingsPage } from '@pages/settings/appearance';
import { WorkspacePage } from '@pages/workspace';
import { AiRulesPage } from '@pages/ai-rules';
import { AiGenerationPage } from '@pages/ai-generation';
import { SystemConfigPage } from '@pages/system-config';
import { SecurityPage } from '@pages/security';
import { NotificationsAdminPage } from '@pages/notifications';
import { NotFoundPage } from '@pages/not-found';
import { InterviewsPage } from '@pages/interviews';
import { CreateInterviewPage } from '@pages/interviews/create';
import { TemplateDetailPage } from '@pages/interviews/template-detail';
import { InterviewSessionPage } from '@pages/interviews/session-detail';
import { UsersPage } from '@pages/users';
import { AIConfigPage } from '@pages/ai-config';
import { AuditLogsPage } from '@pages/audit-logs';
import { AssessmentBuilderPage } from '@pages/assessment-builder';
import { AssessmentDetailPage } from '@pages/assessment-builder/[id]';
import { CandidatePortalDashboard } from '@pages/candidate-portal/dashboard';
import { AssessmentWorkspacePage } from '@pages/candidate-portal/assessment-workspace';
import { SubmissionsPage } from '@pages/candidate-portal/submissions';
import { SubmissionDetailPage } from '@pages/candidate-portal/submission-detail';
import { AssessorDashboard } from '@pages/assessor-review/dashboard';
import { SubmissionReviewPage } from '@pages/assessor-review/submission-review';
import { AssessmentEnrollmentsPage } from '@pages/assessment-builder/enrollments';
import { AssessorsPage } from '@pages/people/assessors';
import { AssessmentTemplatesPage } from '@pages/people/assessment-templates';
import { EvidencePage } from '@pages/evaluation/evidence';
import { AssessmentChecklistPage } from '@pages/evaluation/checklist';
import { AiEvaluationPage } from '@pages/evaluation/ai-evaluation';
import { ManualEvaluationPage } from '@pages/evaluation/manual-evaluation';
import { OralDefensePage } from '@pages/evaluation/oral-defense';
import { CandidateResultsPage } from '@pages/evaluation/candidate-results';
import { OrganizationOverviewPage } from '@pages/organization/overview';
import { BillingPage } from '@pages/subscription/billing';
import { MyWorkspacePage } from '@pages/candidate/workspace';
import { MyTasksPage } from '@pages/candidate/tasks';
import { MyEvidencePage } from '@pages/candidate/evidence';
import { CandidateOralDefensePage } from '@pages/candidate/oral-defense';
import { DefenseHistoryPage } from '@pages/candidate/defense-history';

export function AppRouter() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Multi-step registration — standalone full-screen layouts (form + preview panel) */}
      <Route path="/auth/register/individual" element={<RegisterIndividualPage />} />
      <Route path="/auth/register/organization" element={<RegisterOrganizationPage />} />

      {/* Protected routes — requires authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/exams" element={<ExamsListPage />} />
          <Route path="/exams/:examId" element={<ExamDetailPage />} />
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/assessors" element={<AssessorsPage />} />
          <Route path="/assessment-templates" element={<AssessmentTemplatesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/assessment-checklist" element={<AssessmentChecklistPage />} />
          <Route path="/ai-evaluation" element={<AiEvaluationPage />} />
          <Route path="/manual-evaluation" element={<ManualEvaluationPage />} />
          <Route path="/oral-defense" element={<OralDefensePage />} />
          <Route path="/candidate-results" element={<CandidateResultsPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/subscriptions" element={<OrganizationSubscriptionsPage />} />
          <Route path="/subscriptions/users" element={<UserSubscriptionsPage />} />
          <Route path="/subscriptions/organizations/:organizationId/history" element={<SubscriptionHistoryPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/history" element={<PaymentHistoryPage />} />
          <Route
            path="/organizations"
            element={
              <PermissionGuard permissions={Permissions.ORGANIZATIONS_VIEW}>
                <InstitutionsPage />
              </PermissionGuard>
            }
          />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/organization-overview" element={<OrganizationOverviewPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/interviews/create" element={<CreateInterviewPage />} />
          <Route path="/interviews/template/:templateId" element={<TemplateDetailPage />} />
          <Route path="/interviews/session/:interviewId" element={<InterviewSessionPage />} />
          <Route path="/account" element={<AccountSettingsPage />} />
          <Route path="/notifications" element={<NotificationsAdminPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="appearance" replace />} />
            <Route path="appearance" element={<AppearanceSettingsPage />} />
            <Route path="*" element={<Navigate to="appearance" replace />} />
          </Route>
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/ai-rules" element={<AiRulesPage />} />
          <Route path="/ai-generation" element={<AiGenerationPage />} />
          <Route path="/system-config" element={<SystemConfigPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/notifications/inbox" element={<NotificationsAdminPage />} />
          <Route
            path="/ai-config"
            element={
              <PermissionGuard permissions={Permissions.AI_CONFIGURE}>
                <AIConfigPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <PermissionGuard permissions={Permissions.AUDIT_VIEW}>
                <AuditLogsPage />
              </PermissionGuard>
            }
          />
          <Route path="/assessment-builder" element={<AssessmentBuilderPage />} />
          <Route path="/assessment-builder/:id" element={<AssessmentDetailPage />} />
          <Route path="/assessment-builder/:id/enrollments" element={<AssessmentEnrollmentsPage />} />
          <Route path="/candidate-portal" element={<CandidatePortalDashboard />} />
          <Route path="/candidate-portal/assessment/:assessmentId/workspace" element={<AssessmentWorkspacePage />} />
          <Route path="/candidate-portal/submissions" element={<SubmissionsPage />} />
          <Route path="/candidate-portal/submissions/:id" element={<SubmissionDetailPage />} />
          <Route path="/assessor-review" element={<AssessorDashboard />} />
          <Route path="/assessor-review/submissions/:id" element={<SubmissionReviewPage />} />
          <Route path="/my-workspace" element={<MyWorkspacePage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/my-evidence" element={<MyEvidencePage />} />
          <Route path="/candidate-oral-defense" element={<CandidateOralDefensePage />} />
          <Route path="/defense-history" element={<DefenseHistoryPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
