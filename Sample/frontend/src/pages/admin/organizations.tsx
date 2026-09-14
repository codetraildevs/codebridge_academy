import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { adminService, type AdminOrganization } from '@services/admin-service';
import {
  Building2,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
} from 'lucide-react';
import { cn } from '@utils/cn';

const ORG_TYPE_LABELS: Record<string, string> = {
  TVET_SCHOOL: 'TVET School',
  SECONDARY_SCHOOL: 'Secondary School',
  UNIVERSITY: 'University',
  COMPANY: 'Company',
  GOVERNMENT_INSTITUTION: 'Government',
  EXAMINATION_AUTHORITY: 'Exam Authority',
  CERTIFICATION_BODY: 'Certification Body',
  NGO: 'NGO',
  TRAINING_CENTER: 'Training Center',
  OTHER: 'Other',
};

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Pending', value: 'PENDING' },
];

export function AdminOrganizationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = Number(searchParams.get('page') || '1');
  const statusFilter = searchParams.get('status') || '';
  const searchQuery = searchParams.get('search') || '';

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.listOrganizations({
        page,
        limit: 20,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });
      setOrganizations(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const updateFilters = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    if (updates.page === undefined && !updates.search?.includes(searchQuery)) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const getStatusBadge = (org: AdminOrganization) => {
    if (!org.isActive) return <Badge variant="error">Inactive</Badge>;
    if (!org.isVerified) return <Badge variant="warning">Unverified</Badge>;
    if (org.subscriptionStatus === 'PENDING') return <Badge variant="warning">Pending</Badge>;
    if (org.subscriptionStatus === 'ACTIVE' || org.subscriptionStatus === 'TRIAL') {
      return <Badge variant="success">{org.subscriptionStatus}</Badge>;
    }
    return <Badge variant="neutral">{org.subscriptionStatus}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage all organizations on the platform
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadOrgs}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
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
              placeholder="Search by name, code, or email..."
              value={searchQuery}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-tertiary" />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateFilters({ status: f.value, page: '1' })}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === f.value
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
                <th className="px-4 py-3 font-medium text-text-tertiary">Name</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Code</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Type</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Status</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Plan</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Users</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Candidates</th>
                <th className="px-4 py-3 font-medium text-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-tertiary">
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-tertiary">
                    No organizations found
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-border transition-colors hover:bg-surface-secondary"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">{org.name}</p>
                        <p className="text-xs text-text-tertiary">{org.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface-tertiary px-2 py-0.5 text-xs font-mono">
                        {org.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {ORG_TYPE_LABELS[org.organizationType] || org.organizationType}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(org)}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {org.subscriptionPlan?.name ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{org._count.users}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{org._count.candidates}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => navigate(`/admin/organizations/${org.id}`)}
                        >
                          View
                        </Button>
                        {!org.isVerified && (
                          <Button
                            variant="success"
                            size="xs"
                            onClick={async () => {
                              try {
                                await adminService.verifyOrganization(org.id);
                                loadOrgs();
                              } catch {
                                // handled
                              }
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Approve
                          </Button>
                        )}
                      </div>
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

export default AdminOrganizationsPage;
