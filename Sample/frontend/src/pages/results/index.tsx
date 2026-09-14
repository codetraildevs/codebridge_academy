import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { reportsApi } from '@services/reports-service';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import { Search, ChevronLeft, ChevronRight, Award, Inbox } from 'lucide-react';

const PAGE_SIZE = 20;

export function ResultsPage() {
  const user = useAuthStore((s) => s.user);
  const organizationId = user?.organizationId || undefined;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-results', page, debouncedSearch, organizationId],
    queryFn: () =>
      reportsApi.getResults({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        organizationId,
      }),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Results</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Completed assessments with final scores
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center p-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by candidate or assessment..."
              aria-label="Search results"
              className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </Card>

      {/* Results table */}
      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            Loading results...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Award className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load results.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No completed assessments yet. Results appear here once candidates finish.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-3">Candidate</div>
              <div className="lg:col-span-4">Assessment</div>
              <div className="lg:col-span-2">Score</div>
              <div className="lg:col-span-1">Status</div>
              <div className="lg:col-span-2">Completed</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                >
                  <div className="lg:col-span-3 min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {row.candidate.firstName} {row.candidate.lastName}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">{row.candidate.email}</p>
                  </div>
                  <div className="lg:col-span-4 truncate text-sm text-text-secondary">
                    {row.examTitle}
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {row.totalScore}
                      <span className="text-xs font-normal text-text-tertiary"> / {row.passingScore}</span>
                    </p>
                  </div>
                  <div className="lg:col-span-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        row.passed ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-700',
                      )}
                    >
                      {row.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <div className="lg:col-span-2 text-xs text-text-tertiary">
                    {row.completedAt ? formatDate(row.completedAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta || meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!meta || meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta?.totalPages ?? p, p + 1))}
                    icon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default ResultsPage;
