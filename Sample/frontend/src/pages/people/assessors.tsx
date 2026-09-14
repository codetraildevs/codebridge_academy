import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useRoles, getRoleDisplayName, getRoleAvatarColor } from '@hooks/use-roles';
import { userService, type UserProfile } from '@services/user-service';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import { UserCheck, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

const PAGE_SIZE = 20;

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || 'U')[0]}${(lastName || 'S')[0]}`.toUpperCase();
}

export function AssessorsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: roles } = useRoles();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assessors', page, debouncedSearch],
    queryFn: () =>
      userService.listUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: 'ASSESSOR',
      }),
  });

  const assessors = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Assessors</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage assessors who review and evaluate candidate submissions
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessors by name or email..."
              aria-label="Search assessors"
              className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* Assessors list */}
      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            Loading assessors...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UserCheck className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load assessors.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : assessors.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              No assessors found. Assign the Assessor role to organization users.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-4">Assessor</div>
              <div className="lg:col-span-3">Email</div>
              <div className="lg:col-span-2">Organization</div>
              <div className="lg:col-span-2">Status</div>
              <div className="lg:col-span-1">Joined</div>
            </div>
            <div className="divide-y divide-border">
              {assessors.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                >
                  <div className="lg:col-span-4 flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        getRoleAvatarColor(user.role, roles),
                      )}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {getRoleDisplayName(user.role, roles)}
                      </p>
                    </div>
                  </div>
                  <div className="lg:col-span-3 truncate text-sm text-text-secondary">{user.email}</div>
                  <div className="lg:col-span-2 truncate text-sm text-text-secondary">
                    {user.organizationId ? 'Organization' : '—'}
                  </div>
                  <div className="lg:col-span-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        user.isActive
                          ? 'bg-accent-50 text-accent-700'
                          : 'bg-surface-tertiary text-text-tertiary',
                      )}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="lg:col-span-1 text-xs text-text-tertiary">
                    {formatDate(user.createdAt, { year: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} assessors
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

export default AssessorsPage;
