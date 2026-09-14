import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Input } from '@components/ui/input';
import { candidateService, type AssignedAssessment } from '@services/candidate-service';
import { formatDate } from '@utils/format';
import { htmlToPlainText } from '@utils/rich-text';
import { WORKSPACE_TOOLS, effectiveWorkspaceTools } from '@lib/workspace-tools';
import {
  FileCheck,
  Search,
  Clock,
  GraduationCap,
  Building2,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  PlayCircle,
  Wrench,
} from 'lucide-react';

const PAGE_SIZE = 10;

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'REGISTERED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

export function CandidateAssessmentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await candidateService.getAssignedAssessments({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setAssessments(result.data);
      setTotalCount(result.meta.totalItems);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filteredAssessments = assessments.filter((a) =>
    !searchQuery ||
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tradeName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRegistrationBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'REGISTERED':
        return <Badge variant="info">Registered</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'ABSENT':
        return <Badge variant="error">Absent</Badge>;
      default:
        return <Badge variant="neutral">Not Started</Badge>;
    }
  };

  const handleStartAssessment = (assessment: AssignedAssessment) => {
    if (assessment.registrationStatus === 'IN_PROGRESS') {
      navigate(`/candidate/assessments/${assessment.id}/session`);
    } else if (assessment.registrationStatus === 'COMPLETED') {
      navigate(`/candidate/results`);
    } else {
      navigate(`/candidate/assessments/${assessment.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Assessments</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View and manage your assigned assessments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center rounded-lg bg-surface-tertiary px-3 text-sm text-text-secondary">
            <ListChecks className="mr-1.5 h-4 w-4" />
            {totalCount} total
          </div>
        </div>
      </div>

      {/* ── Search & Filters ──────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-tertiary" />
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Loading assessments...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-error" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">Error</h3>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="primary" className="mt-6" onClick={loadAssessments}>
            Try Again
          </Button>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">
                {searchQuery || statusFilter ? 'No matching assessments' : 'No assessments assigned'}
              </h3>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You haven\'t been assigned any assessments yet. Check back later.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {filteredAssessments.map((assessment, index) => (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  padding="md"
                  className="group cursor-pointer transition-all duration-200 hover:shadow-elevation-medium hover:-translate-y-0.5"
                  onClick={() => handleStartAssessment(assessment)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-50">
                      <FileCheck className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">
                          {assessment.title}
                        </h3>
                        {getRegistrationBadge(assessment.registrationStatus)}
                      </div>
                      {assessment.description && (
                        <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                          {htmlToPlainText(assessment.description)}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-tertiary">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {assessment.tradeName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {assessment.duration} minutes
                        </span>
                        {assessment.organizationName && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {assessment.organizationName}
                          </span>
                        )}
                        {assessment.passingScore != null && assessment.passingScore > 0 && (
                          <span>Pass: {assessment.passingScore}%</span>
                        )}
                        {assessment.registrationCreatedAt && (
                          <span>Assigned: {formatDate(assessment.registrationCreatedAt)}</span>
                        )}
                      </div>

                      {/* Working environment — tools provisioned for this exam (from its
                          trade). Only practical/mixed exams have a practical workspace. */}
                      {assessment.examType !== 'THEORETICAL' && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 text-xs font-medium text-text-tertiary">
                            <Wrench className="h-3.5 w-3.5" />
                            Workspace
                          </span>
                          {effectiveWorkspaceTools(assessment.workspaceTools).map((toolId) => {
                            const def = WORKSPACE_TOOLS.find((t) => t.id === toolId);
                            if (!def) return null;
                            const Icon = def.icon;
                            return (
                              <span
                                key={toolId}
                                title={def.label}
                                aria-label={def.label}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-secondary text-text-secondary transition-colors hover:border-primary-200 hover:text-primary-600"
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 ml-2">
                      {assessment.registrationStatus === 'IN_PROGRESS' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<PlayCircle className="h-4 w-4" />}
                          onClick={(e) => { e.stopPropagation(); handleStartAssessment(assessment); }}
                        >
                          Continue
                        </Button>
                      ) : assessment.registrationStatus === 'COMPLETED' ? (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => { e.stopPropagation(); navigate('/candidate/results'); }}
                        >
                          View Results
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<PlayCircle className="h-4 w-4" />}
                          onClick={(e) => { e.stopPropagation(); handleStartAssessment(assessment); }}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Pagination ────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-tertiary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

export default CandidateAssessmentsPage;
