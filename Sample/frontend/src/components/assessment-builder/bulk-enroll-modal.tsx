import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { assessmentBuilderApi, type BulkEnrollResult } from '@services/assessment-builder-service';
import {
  Search,
  X,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  UserCheck,
  GraduationCap,
  Mail,
  Hash,
} from 'lucide-react';

interface AvailableCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationNumber: string;
  status: string;
}

interface BulkEnrollModalProps {
  assessmentId: string;
  organizationId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function BulkEnrollModal({ assessmentId, organizationId, onClose, onComplete }: BulkEnrollModalProps) {
  const [candidates, setCandidates] = useState<AvailableCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Fetch available candidates
  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    assessmentBuilderApi
      .listAvailableCandidates(assessmentId, organizationId)
      .then((data) => setCandidates(data || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load candidates'))
      .finally(() => setLoading(false));
  }, [assessmentId, organizationId]);

  // Filtered + searched candidates
  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const term = search.toLowerCase();
    return candidates.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.registrationNumber || '').toLowerCase().includes(term),
    );
  }, [candidates, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someFilteredSelected = filtered.some((c) => selectedIds.has(c.id));

  // Sync indeterminate state for select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  // Toggle individual
  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all filtered
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  // Enroll selected
  const handleEnrollSelected = async () => {
    if (selectedIds.size === 0) return;
    setEnrolling(true);
    setError(null);
    try {
      const res = await assessmentBuilderApi.bulkEnroll(assessmentId, [...selectedIds]);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  // Enroll all from organization
  const handleEnrollAll = async () => {
    if (!organizationId) return;
    setEnrolling(true);
    setError(null);
    try {
      const res = await assessmentBuilderApi.enrollAllFromOrganization(assessmentId, organizationId);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  // Close and refresh parent
  const handleDone = () => {
    if (result && result.successCount > 0) {
      onComplete();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Bulk Enroll Candidates</h2>
              <p className="text-xs text-text-secondary">
                {result
                  ? `${result.successCount} of ${result.totalProcessed} enrolled`
                  : `${candidates.length} candidates available`}
              </p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error && !result ? (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <AlertCircle className="h-12 w-12 text-error mb-3" />
            <p className="text-sm font-medium text-text-primary">Failed to load</p>
            <p className="text-sm text-text-secondary mt-1">{error}</p>
            <Button className="mt-4" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : result ? (
          /* ── Results View ── */
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Enrollment complete</p>
                <p className="text-xs text-green-700">
                  {result.successCount} of {result.totalProcessed} candidates enrolled successfully
                </p>
              </div>
            </div>

            {/* Result details */}
            {result.results.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Details</h4>
                <div className="divide-y divide-border rounded-lg border border-border max-h-60 overflow-y-auto">
                  {result.results.map((r) => (
                    <div key={r.candidateId} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.success ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-error shrink-0" />
                        )}
                        <span className="text-xs text-text-primary truncate">{r.candidateId.slice(0, 8)}…</span>
                      </div>
                      <Badge
                        variant={r.success ? 'success' : 'error'}
                        size="sm"
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleDone} size="sm">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* ── Candidate Selection View ── */
          <>
            {/* Search */}
            <div className="px-6 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or registration number..."
                  className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Users className="h-12 w-12 text-text-tertiary" />
                  <p className="mt-3 text-sm font-medium text-text-primary">No candidates available</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    All candidates from your organization are already enrolled.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Search className="h-12 w-12 text-text-tertiary" />
                  <p className="mt-3 text-sm font-medium text-text-primary">No matches</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Select All row */}
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-tertiary cursor-pointer transition-colors">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {allFilteredSelected ? 'Deselect all' : 'Select all'} ({filtered.length} visible)
                    </span>
                  </label>

                  <div className="divide-y divide-border">
                    {filtered.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          selectedIds.has(c.id) ? 'bg-primary-50/50' : 'hover:bg-surface-tertiary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleCandidate(c.id)}
                          className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 shrink-0">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-text-tertiary">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {c.email}
                            </span>
                            {c.registrationNumber && (
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" /> {c.registrationNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                          {c.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
              <div className="text-sm text-text-tertiary">
                {selectedIds.size > 0 ? (
                  <span className="font-medium text-text-primary">{selectedIds.size} selected</span>
                ) : (
                  'Select candidates to enroll'
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEnrollAll}
                  loading={enrolling}
                  icon={<Users className="h-4 w-4" />}
                >
                  Enroll All
                </Button>
                <Button
                  size="sm"
                  onClick={handleEnrollSelected}
                  loading={enrolling}
                  disabled={selectedIds.size === 0}
                  icon={<UserCheck className="h-4 w-4" />}
                >
                  Enroll Selected ({selectedIds.size})
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BulkEnrollModal;
