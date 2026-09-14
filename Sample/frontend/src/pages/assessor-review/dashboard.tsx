import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { assessorReviewApi, type SubmissionForReview, type ReviewStats } from '@services/assessor-review-service';
import {
  Search,
  Loader2,
  Eye,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Users,
  FileCheck,
  Award,
  ChevronRight,
  Filter,
} from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  COMPLETED: 'success',
};

const reviewStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  PENDING: 'neutral',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
  DISPUTED: 'error',
};

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AssessorDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionForReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async (currentPage: number, currentSearch: string, currentStatus: string) => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        assessorReviewApi.listSubmissions({
          page: currentPage,
          limit: 20,
          search: currentSearch || undefined,
          status: currentStatus || undefined,
        }),
        assessorReviewApi.getStats(),
      ]);
      setSubmissions(result.data);
      setTotalPages(result.meta.totalPages);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, search, statusFilter);
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData(1, search, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Assessor Review Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review submitted assessments, compare AI scores, adjust scores, and provide feedback
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.pendingSubmissions}</p>
                <p className="text-xs text-text-secondary">Pending Review</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.inProgress}</p>
                <p className="text-xs text-text-secondary">In Progress</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.completed}</p>
                <p className="text-xs text-text-secondary">Completed</p>
              </div>
            </div>
          </Card>
          <Card variant="outlined" padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalNeedingReview}</p>
                <p className="text-xs text-text-secondary">Total Needing Review</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            placeholder="Search by candidate name, registration, or exam title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            fullWidth
          />
        </div>
        <div className="w-48">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty State */}
      {!loading && submissions.length === 0 && (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No submissions to review</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              {search || statusFilter
                ? 'No submissions match your filters. Try adjusting your search criteria.'
                : 'All submissions have been reviewed. Check back later for new submissions.'}
            </p>
          </div>
        </Card>
      )}

      {/* Submissions List */}
      {!loading && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id} variant="outlined" padding="md" interactive>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 shrink-0">
                      {sub.candidate.firstName[0]}{sub.candidate.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {sub.candidate.firstName} {sub.candidate.lastName}
                      </h3>
                      <p className="text-xs text-text-tertiary">
                        {sub.candidate.registrationNumber} &middot; {sub.exam.title}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <Badge variant={statusVariant[sub.status] || 'neutral'} size="sm">
                      {sub.status.replace(/_/g, ' ')}
                    </Badge>
                    {sub.existingReview && (
                      <Badge variant={reviewStatusVariant[sub.existingReview.status] || 'neutral'} size="sm" dot>
                        Review: {sub.existingReview.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    <span className="text-text-tertiary">
                      Submitted: {formatDateTime(sub.submittedAt)}
                    </span>
                    <span className="text-text-tertiary">{sub.submissionType}</span>
                    {sub.files?.length > 0 && (
                      <span className="text-text-tertiary">{sub.files.length} file(s)</span>
                    )}
                  </div>

                  {/* Score comparison */}
                  <div className="mt-3 flex items-center gap-4">
                    {sub.aiScore !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-tertiary">AI:</span>
                        <span className={`text-sm font-semibold ${
                          sub.aiScore >= (sub.exam.passingScore || 50) ? 'text-success' : 'text-error'
                        }`}>
                          {sub.aiScore.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {sub.assessorScore !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-tertiary">Assessor:</span>
                        <span className="text-sm font-semibold text-primary-600">
                          {sub.assessorScore.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {sub.finalScore !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-tertiary">Final:</span>
                        <span className="text-sm font-semibold text-text-primary">
                          {sub.finalScore.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {sub.aiScore === null && sub.assessorScore === null && (
                      <span className="text-xs text-text-tertiary italic">Not yet scored</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/assessor-review/submissions/${sub.id}`)}
                    icon={<Eye className="h-4 w-4" />}
                  >
                    {sub.existingReview?.status === 'COMPLETED' ? 'View' : 'Review'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default AssessorDashboard;
