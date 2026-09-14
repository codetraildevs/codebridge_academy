import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminAssessment } from '@services/admin-service';
import { formatDate } from '@utils/format';
import { ExamCreateModal } from './components/exam-create-modal';
import { ExamDetailPanel } from './components/exam-detail-panel';
import { AssignAssessmentModal } from './components/assign-assessment-modal';
import {
  BookOpen,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  Plus,
  Send,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const PAGE_SIZE = 10;

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export function AdminAssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState<AdminAssessment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create exam modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [trades, setTrades] = useState<Array<{ id: string; name: string }>>([]);

  // Detail panel
  const [detailExamId, setDetailExamId] = useState<string | null>(null);

  // Assign assessment modal
  const [assignExamId, setAssignExamId] = useState<string | null>(null);
  const [assignExamTitle, setAssignExamTitle] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ examId: string; examTitle: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string) => {
    setToast({ message, type: message.includes('Failed') || message.includes('fail') ? 'error' : 'success' });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.listAssessments({
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setAssessments(result.data);
      setTotalCount(result.meta.totalItems);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  const loadTrades = useCallback(async () => {
    try {
      const data = await adminService.listTrades();
      setTrades(data);
    } catch {
      console.warn('Failed to load trades list');
    }
  }, []);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  useEffect(() => {
    if (showCreateModal) loadTrades();
  }, [showCreateModal, loadTrades]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>;
      case 'PUBLISHED': return <Badge variant="success">Published</Badge>;
      case 'IN_PROGRESS': return <Badge variant="warning">In Progress</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'ARCHIVED': return <Badge variant="error">Archived</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 shadow-modal text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-success-light text-success-dark border border-success/20'
              : 'bg-error-light text-error-dark border border-error/20'
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessments</h1>
          <p className="mt-1 text-sm text-text-secondary">Monitor, manage, and create assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={loadAssessments}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="Search assessments..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-text-tertiary shrink-0" />
          {statusFilters.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary/80'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

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
          <Button variant="primary" className="mt-6" onClick={loadAssessments}>Try Again</Button>
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">No assessments found</h3>
              <p className="mt-2 text-sm text-text-secondary">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first exam to get started.'}
              </p>
              {!searchQuery && !statusFilter && (
                <Button
                  variant="primary"
                  className="mt-6"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Exam
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assessments.map((assessment) => (
              <Card key={assessment.id} padding="md" className="transition-all duration-200 hover:shadow-elevation-medium hover:-translate-y-0.5">
                {/* Status bar */}
                <div className={`-mx-4 -mt-4 mb-3 rounded-t-xl h-1.5 ${
                  assessment.status === 'PUBLISHED' ? 'bg-success' :
                  assessment.status === 'DRAFT' ? 'bg-text-tertiary' :
                  assessment.status === 'IN_PROGRESS' ? 'bg-warning' :
                  assessment.status === 'COMPLETED' ? 'bg-primary-500' : 'bg-error'
                }`} />

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">{assessment.title}</h3>
                      <p className="text-xs text-text-tertiary">{assessment.tradeName}</p>
                    </div>
                  </div>
                  {getStatusBadge(assessment.status)}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{assessment.duration} min</span>
                    <span className="ml-auto">Pass: {assessment.passingScore}%</span>
                  </div>
                  <div className="flex items-center gap-4 text-text-tertiary">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{assessment.registeredCount} registered</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{assessment.completedCount} completed</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">{formatDate(assessment.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDetailExamId(assessment.id)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Button>
                    {assessment.status === 'PUBLISHED' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-primary-600"
                        onClick={() => {
                          setAssignExamId(assessment.id);
                          setAssignExamTitle(assessment.title);
                        }}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Assign
                      </Button>
                    )}
                    {assessment.status === 'DRAFT' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-success"
                        onClick={async () => {
                          try {
                            await adminService.publishExam(assessment.id);
                            showToast('Exam published successfully!');
                            loadAssessments();
                          } catch (err: any) {
                            showToast(err?.response?.data?.message || 'Failed to publish');
                          }
                        }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Publish
                      </Button>
                    )}
                    {assessment.status !== 'ARCHIVED' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-error hover:bg-error-light"
                        onClick={() => setDeleteConfirm({ examId: assessment.id, examTitle: assessment.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-tertiary">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
                <Button variant="ghost" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="h-4 w-4" />}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Exam Modal */}
      <ExamCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          showToast('Exam created successfully!');
          loadAssessments();
        }}
        trades={trades}
      />

      {/* Exam Detail Panel */}
      <ExamDetailPanel
        isOpen={detailExamId !== null}
        onClose={() => setDetailExamId(null)}
        examId={detailExamId}
        onRefresh={loadAssessments}
        onAction={showToast}
      />

      {/* Assign Assessment Modal */}
      <AssignAssessmentModal
        isOpen={assignExamId !== null}
        onClose={() => setAssignExamId(null)}
        examId={assignExamId}
        examTitle={assignExamTitle}
        onAssigned={(message) => {
          showToast(message);
          loadAssessments();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error-light">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Delete Assessment?</h3>
                <p className="text-sm text-text-secondary">{deleteConfirm.examTitle}</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              This will archive the assessment and make it unavailable. This action can be undone by reverting the status.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={deleting}
                loading={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await adminService.deleteExam(deleteConfirm.examId);
                    showToast('Assessment deleted successfully');
                    setDeleteConfirm(null);
                    loadAssessments();
                  } catch (err: any) {
                    showToast(err?.response?.data?.message || 'Failed to delete assessment');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Assessment'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default AdminAssessmentsPage;
