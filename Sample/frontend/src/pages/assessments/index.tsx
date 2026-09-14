import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { assessmentBuilderApi, type Assessment } from '@services/assessment-builder-service';
import { useAuthStore } from '@stores/auth-store';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileEdit,
  GraduationCap,
  Inbox,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';

// ── Tab definitions ───────────────────────────
// URL lives in ?status= so the sidebar's tab nav items can deep-link
// (/assessments?status=draft etc.) and the active tab survives reloads.
type TabKey = 'all' | 'draft' | 'published' | 'assigned';

interface TabDef {
  key: TabKey;
  label: string;
  /** Backend status filter (undefined = no status filter). */
  status?: string;
  /** Assigned tab: resolved per role by the backend (assessor=my reviews, staff=in use). */
  assigned?: boolean;
  hint?: string;
}

const TABS: TabDef[] = [
  { key: 'all', label: 'All', hint: 'Every assessment in the workspace' },
  { key: 'draft', label: 'Draft', status: 'DRAFT', hint: 'Not yet published' },
  { key: 'published', label: 'Published', status: 'PUBLISHED', hint: 'Live and assignable' },
  { key: 'assigned', label: 'Assigned', assigned: true, hint: 'In use or assigned to you for review' },
];

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'info',
  ARCHIVED: 'error',
};

const difficultyBadgeVariant: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
  BEGINNER: 'success',
  INTERMEDIATE: 'info',
  ADVANCED: 'warning',
  EXPERT: 'error',
};

function tabFromParam(value: string | null): TabDef {
  // TABS is a non-empty literal; TABS[0] is the safe default under
  // noUncheckedIndexedAccess.
  return TABS.find((t) => t.key === value) ?? TABS[0]!;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function AssessmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const activeTab = tabFromParam(searchParams.get('status'));

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAssessments = useCallback(
    async (currentPage: number, currentSearch: string, tab: TabDef) => {
      setLoading(true);
      try {
        const result = await assessmentBuilderApi.list({
          page: currentPage,
          limit: 20,
          search: currentSearch || undefined,
          status: tab.status,
          assigned: tab.assigned || undefined,
        });
        setAssessments(result.data);
        setTotalPages(result.meta.totalPages);
      } catch (err) {
        console.error('Failed to fetch assessments:', err);
        setAssessments([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchAssessments(1, search, activeTab);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Fetch on tab or page change
  useEffect(() => {
    setPage(1);
    fetchAssessments(1, search, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab.key]);

  useEffect(() => {
    fetchAssessments(page, search, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const setTab = (tab: TabDef) => {
    setSearchParams(tab.key === 'all' ? {} : { status: tab.key }, { replace: true });
  };

  const isManager = user?.role === 'ORGANIZATION_OWNER' || user?.role === 'ADMIN' || user?.role === 'PLATFORM_OWNER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessments</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View and manage candidate assessments, submissions, and AI evaluations
          </p>
        </div>
        {isManager && (
          <Button onClick={() => navigate('/assessment-builder/new')} icon={<Plus className="h-4 w-4" />}>
            New Assessment
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div role="tablist" aria-label="Assessment status" className="flex flex-wrap gap-1 rounded-full bg-surface-secondary p-1">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              title={tab.hint}
              onClick={() => setTab(tab)}
              className={
                isActive
                  ? 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#2965ff] shadow-sm ring-1 ring-border'
                  : 'rounded-full px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary'
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          id="assessments-search"
          name="assessments-search"
          placeholder="Search assessments by title..."
          aria-label="Search assessments"
          icon={<Search className="h-4 w-4" />}
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && assessments.length === 0 && (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center py-14 text-center">
            <Inbox className="h-14 w-14 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-medium text-text-primary">No {activeTab.key === 'all' ? '' : `${activeTab.label.toLowerCase()} `}assessments</h3>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              {activeTab.assigned
                ? 'Assessments assigned to you or in active use will appear here.'
                : activeTab.status
                  ? `Assessments with status "${activeTab.label}" will appear here.`
                  : 'Create your first assessment to start building tasks, checklists, and AI evaluation rules.'}
            </p>
            {isManager && !activeTab.assigned && (
              <Button
                className="mt-6"
                onClick={() => navigate('/assessment-builder/new')}
                icon={<Plus className="h-4 w-4" />}
              >
                Create Assessment
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Table */}
      {!loading && assessments.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Field</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Difficulty</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Tasks</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Updated</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary"
                    onClick={() => navigate(`/assessment-builder/${assessment.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{assessment.title}</p>
                          <p className="truncate text-xs text-text-tertiary">
                            {assessment.organization?.name ?? 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{assessment.field?.name ?? '—'}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusBadgeVariant[assessment.status] ?? 'neutral'}>
                        {assessment.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={difficultyBadgeVariant[assessment.difficulty] ?? 'neutral'}>
                        {assessment.difficulty}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-text-secondary">
                      {assessment._count?.tasks ?? 0}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-text-secondary">
                      {formatDate(assessment.updatedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={`View ${assessment.title}`}
                          title="View assessment"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assessment-builder/${assessment.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Enrollments for ${assessment.title}`}
                            title="Enrollments"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assessment-builder/${assessment.id}/enrollments`);
                            }}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Edit ${assessment.title}`}
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assessment-builder/${assessment.id}`);
                            }}
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {!loading && assessments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Page <span className="font-medium text-text-primary">{page}</span> of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              icon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Assigned tab hint */}
      {!loading && activeTab.assigned && (
        <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <ClipboardList className="h-3.5 w-3.5" />
          {user?.role === 'ASSESSOR' || user?.role === 'ORGANIZATION_REVIEWER'
            ? 'Assessments you have been assigned to review.'
            : 'Assessments that have active candidate enrollments.'}
        </p>
      )}
    </div>
  );
}

export default AssessmentsPage;
