import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminUser } from '@services/admin-service';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@utils/cn';

const ROLE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error' | 'neutral'> = {
  PLATFORM_OWNER: 'error',
  ORGANIZATION_OWNER: 'warning',
  ADMIN: 'info',
  DESIGNER: 'neutral',
  ASSESSOR: 'info',
  ORGANIZATION_REVIEWER: 'neutral',
  CANDIDATE: 'success',
  INDIVIDUAL_CANDIDATE: 'success',
};

const ROLE_FILTERS = [
  { label: 'All Roles', value: '' },
  { label: 'Platform Owners', value: 'PLATFORM_OWNER' },
  { label: 'Org Owners', value: 'ORGANIZATION_OWNER' },
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Designers', value: 'DESIGNER' },
  { label: 'Assessors', value: 'ASSESSOR' },
  { label: 'Candidates', value: 'CANDIDATE' },
];

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = Number(searchParams.get('page') || '1');
  const roleFilter = searchParams.get('role') || '';
  const searchQuery = searchParams.get('search') || '';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.listUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter || undefined,
      });
      setUsers(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateFilters = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    if (updates.page === undefined) newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await adminService.updateUser(userId, { isActive: !currentActive });
      loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage all users across the platform
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadUsers}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters */}
      <Card padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateFilters({ role: f.value })}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  roleFilter === f.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-secondary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium text-text-tertiary">User</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Role</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Type</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Organization</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Status</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-tertiary">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-tertiary">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border transition-colors hover:bg-surface-secondary"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-text-tertiary">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_COLORS[user.role] || 'neutral'} size="sm">
                        {user.role.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{user.userType}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {user.organization?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'success' : 'error'} size="sm">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant={user.isActive ? 'ghost' : 'primary'}
                        size="xs"
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-tertiary">
            Showing {(meta.page - 1) * meta.limit + 1} to{' '}
            {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => updateFilters({ page: String(meta.page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => updateFilters({ page: String(meta.page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
