import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { candidatePortalApi, type ExamRegistration } from '@services/candidate-portal-service';
import type { Assessment } from '@services/assessment-builder-service';
import { RichTextRenderer } from '@components/assessment-builder/rich-text-renderer';
import { useAssessmentSocket } from '@hooks/use-assessment-socket';
import type { ReviewCompletedPayload } from '@hooks/use-assessment-socket';
import { useOrgUsage } from '@hooks/use-org-usage';
import { AssessmentQuotaBanner } from '@components/subscription/assessment-quota-banner';
import {
  GraduationCap,
  FileCheck,
  Clock,
  Loader2,
  Play,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  BookOpen,
  Trophy,
  Bell,
} from 'lucide-react';

// ── Tab definitions ───────────────────────────
// URL lives in ?tab= so the sidebar's candidate nav items can deep-link
// (/candidate-portal?tab=available etc.) and the active tab survives reloads.
type PortalTab = 'registered' | 'available' | 'active' | 'history';

interface PortalTabDef {
  key: PortalTab;
  label: string;
  hint: string;
}

const PORTAL_TABS: PortalTabDef[] = [
  { key: 'registered', label: 'My Assessments', hint: 'Everything you have registered for' },
  { key: 'available', label: 'Available', hint: 'Open assessments you can register for' },
  { key: 'active', label: 'Active', hint: 'Assessments currently in progress' },
  { key: 'history', label: 'History', hint: 'Completed assessments and results' },
];

function tabFromParam(value: string | null): PortalTab {
  return PORTAL_TABS.some((t) => t.key === value) ? (value as PortalTab) : 'registered';
}

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  REGISTERED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  WITHDRAWN: 'error',
  ABSENT: 'error',
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'COMPLETED': return CheckCircle2;
    case 'IN_PROGRESS': return Play;
    case 'WITHDRAWN': return XCircle;
    default: return Clock;
  }
}

export function CandidatePortalDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [available, setAvailable] = useState<Assessment[]>([]);
  const [registrations, setRegistrations] = useState<ExamRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const activeTab = tabFromParam(searchParams.get('tab'));
  const [reviewNotifications, setReviewNotifications] = useState<ReviewCompletedPayload[]>([]);

  // Org assessment-volume quota — shown so candidates understand why
  // registration may be paused when their organization's plan cap is hit.
  const orgUsage = useOrgUsage();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [avail, regs] = await Promise.all([
        candidatePortalApi.listAvailableAssessments(),
        candidatePortalApi.listRegistrations(),
      ]);
      setAvailable(avail);
      setRegistrations(regs);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Real-time WebSocket: listen for assessor review completions ──
  const handleReviewCompleted = useCallback((payload: ReviewCompletedPayload) => {
    setReviewNotifications((prev) => [payload, ...prev].slice(0, 5)); // keep last 5
    // Auto-refresh registrations to pick up score changes
    candidatePortalApi.listRegistrations()
      .then(setRegistrations)
      .catch(console.error);
  }, []);

  useAssessmentSocket(handleReviewCompleted);

  // Auto-dismiss notifications after 8 seconds
  useEffect(() => {
    if (reviewNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setReviewNotifications([]);
    }, 8000);
    return () => clearTimeout(timer);
  }, [reviewNotifications]);

  // Auto-dismiss error banners after 6 seconds
  useEffect(() => {
    if (!registerError) return;
    const timer = setTimeout(() => setRegisterError(null), 6000);
    return () => clearTimeout(timer);
  }, [registerError]);

  useEffect(() => {
    if (!startError) return;
    const timer = setTimeout(() => setStartError(null), 6000);
    return () => clearTimeout(timer);
  }, [startError]);

  const handleRegister = async (assessmentId: string) => {
    setRegisterError(null);
    setRegistering(assessmentId);
    try {
      await candidatePortalApi.registerForAssessment(assessmentId);
      await fetchData();
      // Default view has no query params — matches the tab button behavior.
      setSearchParams({}, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register for assessment. Please try again.';
      setRegisterError(message);
      console.error('Registration failed:', err);
    } finally {
      setRegistering(null);
    }
  };

  const handleStartAssessment = async (reg: ExamRegistration) => {
    setStartError(null);
    try {
      const session = await candidatePortalApi.startSession(reg.examId, reg.id);
      navigate(`/candidate-portal/assessment/${reg.examId}/workspace?session=${session.id}&registration=${reg.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start assessment session. Please try again.';
      setStartError(message);
      console.error('Failed to start session:', err);
    }
  };

  // Calculate overall stats
  const activeRegistrations = registrations.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'REGISTERED');
  const completedRegistrations = registrations.filter((r) => r.status === 'COMPLETED');

  // Registrations shown on the non-available tabs, filtered by the active view.
  const viewRegistrations =
    activeTab === 'active'
      ? registrations.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'REGISTERED')
      : activeTab === 'history'
        ? registrations.filter((r) => r.status === 'COMPLETED')
        : registrations;
  const totalSubmissions = registrations.reduce((sum, r) => sum + r.submittedCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Review Notification Banner */}
      <AnimatePresence>
        {reviewNotifications.length > 0 && (
          <div className="space-y-2">
            {reviewNotifications.map((n) => (
              <motion.div
                key={`${n.examId}-${n.submissionId}`}
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3"
              >
              <Bell className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">Review Completed</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Your submission for <strong>{n.examTitle}</strong> has been reviewed.
                  {n.finalScore !== null && (
                    <span> Final score: <strong>{n.finalScore}%</strong></span>
                  )}
                </p>
              </div>
              <button
                onClick={() =>
                  setReviewNotifications((prev) => prev.filter((r) => r.submissionId !== n.submissionId))
                }
                className="shrink-0 rounded-md p-1 text-green-500 hover:bg-green-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <XCircle className="h-4 w-4" />
              </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Error Banners */}
      {registerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Registration failed</p>
            <p className="text-sm text-red-700 mt-0.5">{registerError}</p>
          </div>
          <button
            onClick={() => setRegisterError(null)}
            className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {startError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Failed to start session</p>
            <p className="text-sm text-red-700 mt-0.5">{startError}</p>
          </div>
          <button
            onClick={() => setStartError(null)}
            className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-100 transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Assessments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Browse available assessments, track your progress, and manage submissions
        </p>
      </div>

      {/* Org assessment-volume quota banner */}
      <AssessmentQuotaBanner usage={orgUsage} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{registrations.length}</p>
              <p className="text-xs text-text-secondary">Total Registered</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{activeRegistrations.length}</p>
              <p className="text-xs text-text-secondary">In Progress</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{completedRegistrations.length}</p>
              <p className="text-xs text-text-secondary">Completed</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{totalSubmissions}</p>
              <p className="text-xs text-text-secondary">Submissions Made</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Toggle */}
      <div role="tablist" aria-label="Assessment views" className="flex gap-2 overflow-x-auto border-b border-border">
        {PORTAL_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          const count =
            tab.key === 'registered'
              ? registrations.length
              : tab.key === 'available'
                ? available.length
                : tab.key === 'active'
                  ? activeRegistrations.length
                  : completedRegistrations.length;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              title={tab.hint}
              onClick={() => setSearchParams(tab.key === 'registered' ? {} : { tab: tab.key }, { replace: true })}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Registered / Active / History Tab ── */}
      {activeTab !== 'available' && (
        <>
          {viewRegistrations.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-12 text-center">
                <BookOpen className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-medium text-text-primary">
                  {activeTab === 'active' ? 'No active assessments' : activeTab === 'history' ? 'No completed assessments yet' : 'No registrations yet'}
                </h3>
                <p className="mt-2 max-w-md text-sm text-text-secondary">
                  {activeTab === 'active'
                    ? 'Assessments you have started will appear here.'
                    : activeTab === 'history'
                      ? 'Completed assessments will appear here with your results.'
                      : 'Browse available assessments below and register to start your journey.'}
                </p>
                {activeTab === 'registered' && (
                  <Button
                    className="mt-6"
                    onClick={() => setSearchParams({ tab: 'available' }, { replace: true })}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Browse Assessments
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {viewRegistrations.map((reg) => {
                const StatusIcon = getStatusIcon(reg.status);
                return (
                  <Card key={reg.id} variant="outlined" padding="md" interactive>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-text-primary truncate">
                            {reg.exam.title}
                          </h3>
                          <Badge variant={statusVariant[reg.status] || 'neutral'} size="sm">
                            <StatusIcon className="h-3 w-3 mr-1 inline" />
                            {reg.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {reg.exam.duration} min
                          </span>
                          <span>Pass: {reg.exam.passingScore}%</span>
                          <span>{reg.submittedCount} submitted / {reg.totalSubmissions} total</span>
                          {reg.latestSession?.startedAt && (
                            <span>
                              Started {new Date(reg.latestSession.startedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {reg.totalSubmissions > 0 && (
                          <div className="mt-3 w-full max-w-xs">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                              <div
                                className="bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${(reg.submittedCount / reg.totalSubmissions) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {(reg.status === 'REGISTERED' || reg.status === 'IN_PROGRESS') && (
                          <Button
                            size="sm"
                            onClick={() => handleStartAssessment(reg)}
                            icon={<Play className="h-4 w-4" />}
                          >
                            {reg.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                          </Button>
                        )}
                        {reg.status === 'COMPLETED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/candidate-portal/submissions?exam=${reg.examId}`)}
                            icon={<Eye className="h-4 w-4" />}
                          >
                            View Results
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Available Tab ── */}
      {activeTab === 'available' && (
        <>
          {available.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <div className="flex flex-col items-center py-12 text-center">
                <AlertCircle className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-medium text-text-primary">No available assessments</h3>
                <p className="mt-2 max-w-md text-sm text-text-secondary">
                  There are no open assessments available for registration at this time.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {available.map((assessment) => (
                <Card key={assessment.id} variant="outlined" padding="md" interactive>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-text-primary truncate">
                          {assessment.title}
                        </h3>
                        {assessment.difficulty && (
                          <Badge variant="info" size="sm">
                            {assessment.difficulty}
                          </Badge>
                        )}
                      </div>
                      {assessment.description && (
                        <RichTextRenderer
                          html={assessment.description}
                          className="mt-1 line-clamp-2"
                        />
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                        {assessment.field && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {assessment.field.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assessment.durationMinutes} min
                        </span>
                        {assessment._count && (
                          <span>{assessment._count.tasks} tasks</span>
                        )}
                        <span>Pass: {assessment.passingScore}%</span>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRegister(assessment.id)}
                        loading={registering === assessment.id}
                        icon={<Plus className="h-4 w-4" />}
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CandidatePortalDashboard;
