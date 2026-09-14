import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useRoles, getRoleDisplayName, getRoleAvatarColor } from '@hooks/use-roles';
import { userService, type UserProfile } from '@services/user-service';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import { CreateUserModal } from './components/create-user-modal';
import { Users as UsersIcon, Search, ChevronLeft, ChevronRight, Inbox, UserPlus } from 'lucide-react';

const PAGE_SIZE = 20;

const USER_MANAGER_ROLES = ['PLATFORM_OWNER', 'ORGANIZATION_OWNER', 'ADMIN'];

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || 'U')[0]}${(lastName || 'S')[0]}`.toUpperCase();
}

/** Distinguish org members, platform owners, self-registered candidates, and
 *  platform-created org-less staff such as assessors. */
function accountLabel(user: UserProfile): string {
  if (user.userType === 'PLATFORM') return 'Platform';
  if (user.userType === 'ORGANIZATION') return 'Organization';
  return user.role === 'CANDIDATE' || user.role === 'INDIVIDUAL_CANDIDATE'
    ? 'Individual'
    : 'Platform staff';
}

function UserAvatar({ user }: { user: UserProfile }) {
  const color = getRoleAvatarColor(user.role);
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        color,
      )}
    >
      {getInitials(user.firstName, user.lastName)}
    </div>
  );
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const currentUser = useAuthStore((s) => s.user);
  const { data: roles } = useRoles();
  const canManageUsers = USER_MANAGER_ROLES.includes(currentUser?.role ?? '');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', page, debouncedSearch, role],
    queryFn: () =>
      userService.listUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: role || undefined,
      }),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All accounts — organization members
          </p>
        </div>
        {canManageUsers && (
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Add User
          </Button>
        )}
      </div>

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refetch()}
        isPlatformOwner={currentUser?.role === 'PLATFORM_OWNER'}
      />

      {/* Search + role filter */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
                aria-label="Search users"
                className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="role-filter" className="text-sm text-text-tertiary">
                Role
              </label>
              <select
                id="role-filter"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All roles</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.name}>
                    {getRoleDisplayName(r.name, roles)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Users list */}
      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            Loading users...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UsersIcon className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load users.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">
              {currentUser?.role === 'PLATFORM_OWNER'
                ? 'No users match.'
                : 'No users in this organization yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className="lg:col-span-4">User</div>
              <div className="lg:col-span-3">Email</div>
              <div className="lg:col-span-2">Role</div>
              <div className="lg:col-span-2">Status</div>
              <div className="lg:col-span-1">Joined</div>
            </div>
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center"
                >
                  <div className="lg:col-span-4 flex items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {accountLabel(user)}
                      </p>
                    </div>
                  </div>
                  <div className="lg:col-span-3 truncate text-sm text-text-secondary">{user.email}</div>
                  <div className="lg:col-span-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        getRoleAvatarColor(user.role, roles),
                      )}
                    >
                      {getRoleDisplayName(user.role, roles)}
                    </span>
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
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} users
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

export default UsersPage;
