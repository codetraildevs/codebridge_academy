import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@components/ui/modal';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminCandidate } from '@services/admin-service';
import {
  Search,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  Users,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 12;

interface AssignAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string | null;
  examTitle: string;
  onAssigned: (message: string) => void;
}

export function AssignAssessmentModal({
  isOpen,
  onClose,
  examId,
  examTitle,
  onAssigned,
}: AssignAssessmentModalProps) {
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setPage(1);
      setSearchQuery('');
      setStatusFilter('');
      setError('');
    }
  }, [isOpen]);

  const loadCandidates = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError('');
    try {
      const result = await adminService.listCandidates({
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setCandidates(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [examId, page, searchQuery, statusFilter]);

  useEffect(() => {
    if (isOpen && examId) loadCandidates();
  }, [isOpen, examId, loadCandidates]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleAssign = async () => {
    if (!examId || selectedIds.size === 0) return;
    setSelecting(true);
    setError('');
    try {
      const result = await adminService.assignAssessment({
        examId,
        candidateIds: Array.from(selectedIds),
      });
      onAssigned(result.message || `Assessment assigned to ${selectedIds.size} candidate(s)`);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to assign assessment');
    } finally {
      setSelecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success" size="sm">Active</Badge>;
      case 'INACTIVE': return <Badge variant="neutral" size="sm">Inactive</Badge>;
      case 'SUSPENDED': return <Badge variant="error" size="sm">Suspended</Badge>;
      case 'GRADUATED': return <Badge variant="info" size="sm">Graduated</Badge>;
      default: return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const statusFilters = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Graduated', value: 'GRADUATED' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Assessment"
      description={`Select candidates to assign: ${examTitle}`}
      size="lg"
    >
      {/* Search & Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-tertiary font-medium">Status:</span>
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
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

      {/* Selection bar */}
      {candidates.length > 0 && !loading && (
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {selectedIds.size === candidates.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Candidate list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-tertiary">Loading candidates...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={loadCandidates}>
            Retry
          </Button>
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-text-tertiary mb-3" />
          <h3 className="text-sm font-medium text-text-primary">No candidates found</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            {searchQuery || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'No candidates are available in your organization.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 -mr-1">
            {candidates.map((candidate) => {
              const isSelected = selectedIds.has(candidate.id);
              return (
                <button
                  key={candidate.id}
                  onClick={() => toggleCandidate(candidate.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary-300 bg-primary-50 shadow-sm'
                      : 'border-border bg-white hover:border-border-hover hover:bg-surface-secondary'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-border'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {candidate.firstName} {candidate.lastName}
                      </span>
                      {getStatusBadge(candidate.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                      <span className="truncate">{candidate.email}</span>
                      {candidate.trade && (
                        <>
                          <span className="text-text-tertiary/50">·</span>
                          <span className="truncate">{candidate.trade}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {candidate.averageScore !== null && (
                    <div className="shrink-0 text-right">
                      <span className={`text-xs font-semibold ${
                        candidate.averageScore >= 70
                          ? 'text-success'
                          : candidate.averageScore >= 50
                            ? 'text-warning'
                            : 'text-error'
                      }`}>
                        {candidate.averageScore}%
                      </span>
                      <p className="text-[10px] text-text-tertiary">{candidate.assessmentsCompleted} completed</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-tertiary">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous page"
                  className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                  className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary disabled:opacity-40 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-error flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={selectedIds.size === 0}
            loading={selecting}
            onClick={handleAssign}
          >
            {selecting ? 'Assigning...' : (
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                Assign to {selectedIds.size > 0 ? `${selectedIds.size} candidate${selectedIds.size !== 1 ? 's' : ''}` : 'Selected'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AssignAssessmentModal;
