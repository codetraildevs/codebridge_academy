import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminCandidate } from '@services/admin-service';
import { formatDate } from '@utils/format';
import { ImportCandidatesModal } from './components/import-candidates-modal';
import {
  UserCheck,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  GraduationCap,
  Mail,
  Phone,
  BarChart3,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Upload,
} from 'lucide-react';

const PAGE_SIZE = 10;

const statusFilters = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Graduated', value: 'GRADUATED' },
];

export function AdminCandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const loadCandidates = useCallback(async () => {
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
      setTotalCount(result.meta.totalItems);
      setTotalPages(result.meta.totalPages);
    } catch (err: any) {
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success" dot>Active</Badge>;
      case 'INACTIVE': return <Badge variant="neutral" dot>Inactive</Badge>;
      case 'SUSPENDED': return <Badge variant="error" dot>Suspended</Badge>;
      case 'GRADUATED': return <Badge variant="warning" dot>Graduated</Badge>;
      default: return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-text-tertiary';
    if (score >= 70) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Candidates</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage and monitor candidate progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={loadCandidates}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setShowImportModal(true)}>
            Import CSV
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-text-tertiary shrink-0" />
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="mt-4 text-sm text-text-secondary">Loading candidates...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-error" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">Error</h3>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Button variant="primary" className="mt-6" onClick={loadCandidates}>Try Again</Button>
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-16 text-center">
              <UserCheck className="h-12 w-12 text-text-tertiary" />
              <h3 className="mt-4 text-lg font-medium text-text-primary">No candidates found</h3>
              <p className="mt-2 text-sm text-text-secondary">
                {searchQuery || statusFilter ? 'Try adjusting your search.' : 'Start by registering candidates.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <Card key={candidate.id} padding="md" className="transition-all duration-200 hover:shadow-elevation-medium">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">
                        {candidate.firstName} {candidate.lastName}
                      </h3>
                      {getStatusBadge(candidate.status)}
                      <span className="text-xs font-mono text-text-tertiary">#{candidate.registrationNumber}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.email}</span>
                      {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{candidate.phone}</span>}
                      {candidate.trade && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{candidate.trade}</span>}
                      <span>Enrolled: {formatDate(candidate.enrollmentDate)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-text-tertiary">
                        Assessments: <strong className="text-text-primary">{candidate.assessmentsCompleted}</strong>
                      </span>
                      {candidate.averageScore !== null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Avg Score: <strong className={getScoreColor(candidate.averageScore)}>{candidate.averageScore}%</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center ml-2">
                    <Button size="sm" variant="ghost">View Profile</Button>
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

      {/* Import Candidates Modal */}
      <ImportCandidatesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadCandidates}
      />
    </motion.div>
  );
}

export default AdminCandidatesPage;
