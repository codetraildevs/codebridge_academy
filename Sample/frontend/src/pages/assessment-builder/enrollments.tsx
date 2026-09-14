import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { assessmentBuilderApi, type Assessment, type Enrollment } from '@services/assessment-builder-service';
import { useAuthStore } from '@stores/auth-store';
import { BulkEnrollModal } from '@components/assessment-builder/bulk-enroll-modal';
import {
  Loader2,
  ChevronLeft,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Trash2,
  Search,
  GraduationCap,
  FileCheck,
  Trophy,
} from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  REGISTERED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  WITHDRAWN: 'error',
  ABSENT: 'error',
};

export function AssessmentEnrollmentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchData = async () => {
    if (!id) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [assess, enroll] = await Promise.all([
        assessmentBuilderApi.getById(id),
        assessmentBuilderApi.listEnrollments(id, {
          page,
          limit: 20,
          status: statusFilter || undefined,
        }),
      ]);
      setAssessment(assess);
      setEnrollments(enroll.data);
      setTotalPages(enroll.meta.totalPages);
      setTotalItems(enroll.meta.totalItems);
    } catch (err) {
      console.error('Failed to load:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, page, statusFilter]);

  const handleRemoveEnrollment = async (enrollmentId: string, candidateId: string) => {
    if (!id) return;
    if (!window.confirm('Remove this candidate from the assessment?')) return;
    try {
      await assessmentBuilderApi.removeEnrollment(id, candidateId);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  const stats = {
    total: totalItems || enrollments.length,
    inProgress: enrollments.filter((e) => e.status === 'IN_PROGRESS').length,
    completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
    submitted: enrollments.filter((e) => e.submittedCount > 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }      if (loadError) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-text-tertiary" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Assessment not found</h3>
        <p className="mt-2 text-sm text-text-secondary">Could not load assessment data. The ID may be missing or invalid.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/assessment-builder')}>
          Back to Assessments
        </Button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-text-territory" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Assessment not found</h3>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/assessment-builder')}>
          Back to Assessments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/assessment-builder/${id}`)}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Enrollments</h1>
            <p className="text-sm text-text-secondary">{assessment.title}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowBulkModal(true)}
          disabled={!assessment.organizationId}
          title={!assessment.organizationId ? 'No organization linked to this assessment' : 'Bulk enroll candidates'}
          icon={<UserPlus className="h-4 w-4" />}
        >
          Bulk Enroll
        </Button>
      </div>

      {/* Bulk Enroll Modal */}
      {showBulkModal && assessment.organizationId && (
        <BulkEnrollModal
          assessmentId={id!}
          organizationId={assessment.organizationId}
          onClose={() => setShowBulkModal(false)}
          onComplete={() => {
            setShowBulkModal(false);
            fetchData();
          }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-secondary">Enrolled</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.inProgress}</p>
              <p className="text-xs text-text-secondary">In Progress</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.completed}</p>
              <p className="text-xs text-text-secondary">Completed</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.submitted}</p>
              <p className="text-xs text-text-secondary">Submitted Work</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <div className="w-48">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </div>
        <div className="text-sm text-text-tertiary">
          {page} of {totalPages} pages
        </div>
      </div>

      {/* Enrollments List */}
      {enrollments.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No enrollments yet</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Candidates can self-register via the Candidate Portal, or an admin can enroll them.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id} variant="outlined" padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 shrink-0">
                      {enrollment.candidate.firstName[0]}{enrollment.candidate.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {enrollment.candidate.firstName} {enrollment.candidate.lastName}
                      </h3>
                      <p className="text-xs text-text-tertiary">
                        {enrollment.candidate.registrationNumber} &middot; {enrollment.candidate.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <Badge variant={statusVariant[enrollment.status] || 'neutral'} size="sm">
                      {enrollment.status.replace(/_/g, ' ')}
                    </Badge>
                    {enrollment.totalScore !== null && (
                      <span className="font-semibold text-text-primary">
                        Score: {enrollment.totalScore.toFixed(1)}%
                      </span>
                    )}
                    <span className="text-text-tertiary">
                      {enrollment.submittedCount}/{enrollment.totalSubmissions} submissions
                    </span>
                    {enrollment.latestSession?.startedAt && (
                      <span className="text-text-tertiary">
                        Started: {new Date(enrollment.latestSession.startedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {enrollment.totalSubmissions > 0 && (
                    <div className="mt-2 w-full max-w-xs">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                        <div
                          className="bg-primary-500 rounded-full transition-all"
                          style={{ width: `${(enrollment.submittedCount / enrollment.totalSubmissions) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4 shrink-0">
                  {(enrollment.status === 'REGISTERED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleRemoveEnrollment(enrollment.id, enrollment.candidate.id)}
                      aria-label="Remove enrollment"
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-secondary">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default AssessmentEnrollmentsPage;
