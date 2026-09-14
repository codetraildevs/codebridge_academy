import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { SeatsMeter } from '@components/ui/seats-meter';
import { organizationService } from '@services/organization-service';
import { subscriptionService } from '@services/subscription-service';
import type { SeatTrendRow } from '@services/dashboard-service';
import { SeatUsageTrend } from '../dashboard/components/shared/seat-usage-trend';
import type { Organization } from '../../types';
import {
  Building2,
  Search,
  X,
  ArrowUpDown,
  ChevronRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Globe,
  Mail,
  Phone,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────
function orgTypeLabel(type: string): string {
  switch (type) {
    case 'TVET_SCHOOL': return 'TVET School';
    case 'SECONDARY_SCHOOL': return 'Secondary School';
    case 'UNIVERSITY': return 'University';
    case 'COMPANY': return 'Company';
    case 'GOVERNMENT_INSTITUTION': return 'Government';
    case 'EXAMINATION_AUTHORITY': return 'Exam Authority';
    case 'CERTIFICATION_BODY': return 'Certification Body';
    case 'NGO': return 'NGO';
    case 'TRAINING_CENTER': return 'Training Center';
    default: return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'ACTIVE': return <Badge variant="success" dot>Active</Badge>;
    case 'TRIAL': return <Badge variant="info" dot>Trial</Badge>;
    case 'PENDING': return <Badge variant="warning" dot>Pending</Badge>;
    case 'EXPIRED': return <Badge variant="error" dot>Expired</Badge>;
    case 'CANCELLED': return <Badge variant="neutral" dot>Cancelled</Badge>;
    default: return <Badge variant="neutral">{status}</Badge>;
  }
}

function isActiveBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="success" dot>Active</Badge>
    : <Badge variant="neutral" dot>Inactive</Badge>;
}

function typeColor(type: string): string {
  switch (type) {
    case 'TVET_SCHOOL': return 'bg-orange-100 text-orange-700';
    case 'SECONDARY_SCHOOL': return 'bg-green-100 text-green-700';
    case 'UNIVERSITY': return 'bg-blue-100 text-blue-700';
    case 'COMPANY': return 'bg-purple-100 text-purple-700';
    case 'GOVERNMENT_INSTITUTION': return 'bg-red-100 text-red-700';
    case 'EXAMINATION_AUTHORITY': return 'bg-cyan-100 text-cyan-700';
    case 'CERTIFICATION_BODY': return 'bg-pink-100 text-pink-700';
    case 'NGO': return 'bg-emerald-100 text-emerald-700';
    case 'TRAINING_CENTER': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// ── Org Type Icon ───────────────────────────────
function OrgTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'GOVERNMENT_INSTITUTION': return <Building2 className="h-4 w-4" />;
    case 'COMPANY': return <Building2 className="h-4 w-4" />;
    case 'UNIVERSITY':
    case 'TVET_SCHOOL':
    case 'SECONDARY_SCHOOL': return <Building2 className="h-4 w-4" />;
    default: return <Building2 className="h-4 w-4" />;
  }
}

// ── Detail Panel ────────────────────────────────
function OrganizationDetailPanel({
  org,
  seatTrend,
  onClose,
  onToggleActive,
}: {
  org: Organization | null;
  /** Seat usage trend fetched by the page (null = loading, [] = empty/failed). */
  seatTrend: SeatTrendRow[] | null;
  onClose: () => void;
  onToggleActive: (id: string, current: boolean) => void;
}) {
  if (!org) return null;

  return (
    <div className="lg:w-96 border-l border-border bg-white p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">Organization Details</h3>
        <button onClick={onClose} className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Name & Type */}
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${typeColor(org.organizationType)}`}>
            <OrgTypeIcon type={org.organizationType} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{org.name}</p>
            <Badge variant="neutral" size="sm">{org.code}</Badge>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {isActiveBadge(org.isActive)}
          {statusBadge(org.subscriptionStatus)}
        </div>

        {/* Type */}
        <div className="rounded-lg bg-surface-secondary px-3 py-2">
          <p className="text-xs text-text-tertiary">Organization Type</p>
          <p className="text-sm font-medium text-text-primary">{orgTypeLabel(org.organizationType)}</p>
        </div>

        {/* Contact */}
        {org.email && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2">
            <Mail className="h-4 w-4 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Email</p>
              <p className="text-sm text-text-primary">{org.email}</p>
            </div>
          </div>
        )}
        {org.phone && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2">
            <Phone className="h-4 w-4 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Phone</p>
              <p className="text-sm text-text-primary">{org.phone}</p>
            </div>
          </div>
        )}
        {org.website && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2">
            <Globe className="h-4 w-4 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Website</p>
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline flex items-center gap-1"
              >
                {org.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Limits */}
        <div className="rounded-lg bg-surface-secondary p-3">
          <p className="text-xs font-semibold text-text-tertiary mb-2 uppercase tracking-wider">Limits</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Max Users</span>
              <span className="font-medium text-text-primary">{org.maxUsers}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Max Candidates</span>
              <span className="font-medium text-text-primary">{org.maxCandidates}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Max Job Postings</span>
              <span className="font-medium text-text-primary">{org.maxJobPostings}</span>
            </div>
          </div>
        </div>

        {/* Seat usage trend — same single-series chart as the org dashboard.
            The shared card renders nothing itself when the trend is empty. */}
        {seatTrend === null ? (
          <div className="animate-pulse rounded-lg bg-surface-secondary p-3">
            <div className="h-3 w-24 rounded bg-surface-tertiary mb-3" />
            <div className="h-24 rounded bg-surface-tertiary" />
          </div>
        ) : seatTrend.length > 0 ? (
          <SeatUsageTrend
            trend={seatTrend}
            bars={[
              { key: 'seatsConsumed', color: '#10B981', monthlyLabel: 'Seats consumed', cumulativeLabel: 'Seats in use' },
            ]}
            footnoteMonthly="Candidates created per month = seats consumed by this org (one Candidate row per seat)"
            footnoteCumulative="Seats in use = running total of candidates created by this org (one Candidate row per seat)"
          />
        ) : null}

        {/* Dates */}
        <div className="rounded-lg bg-surface-secondary p-3">
          <p className="text-xs font-semibold text-text-tertiary mb-2 uppercase tracking-wider">Dates</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Created</span>
              <span className="font-medium text-text-primary">
                {new Date(org.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Updated</span>
              <span className="font-medium text-text-primary">
                {new Date(org.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            fullWidth
            variant={org.isActive ? 'danger' : 'success'}
            size="sm"
            onClick={() => onToggleActive(org.id, org.isActive)}
          >
            {org.isActive ? 'Deactivate Organization' : 'Activate Organization'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────
export function InstitutionsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const orgParam = searchParams.get('org');

  // Seat usage trend for the open detail panel — fetched here (once per org)
  // rather than inside OrganizationDetailPanel because the panel is mounted in
  // two places (desktop side panel + mobile sheet) and an internal fetch would
  // fire two identical stats requests. null = loading; [] = empty / failed.
  const selectedOrgId = selectedOrg?.id;
  const [selectedOrgTrend, setSelectedOrgTrend] = useState<SeatTrendRow[] | null>(null);

  useEffect(() => {
    if (!selectedOrgId) {
      setSelectedOrgTrend(null);
      return;
    }
    let cancelled = false;
    setSelectedOrgTrend(null);
    subscriptionService
      .getOrgStatsById(selectedOrgId)
      .then((stats) => {
        if (!cancelled) setSelectedOrgTrend(stats.seatUsageTrend ?? []);
      })
      .catch(() => {
        // Trend is supplementary — leave the card hidden on failure.
        if (!cancelled) setSelectedOrgTrend([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  /** Select (or deselect) an org and mirror it into the ?org= URL param so
   *  the detail panel is shareable / deep-linkable (e.g. from the platform
   *  dashboard's seat-usage rows). */
  const selectOrg = (org: Organization | null) => {
    setSelectedOrg(org);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (org) next.set('org', org.id);
        else next.delete('org');
        return next;
      },
      { replace: true },
    );
  };

  // Deep link: ?org=<id> opens that org's detail panel on load. If the org is
  // already on the current page it comes from the list; otherwise fall back to
  // fetching it by id — but only after the initial list has loaded (so a page-1
  // org isn't double-fetched) and only once per id (so search/filter list
  // refreshes don't re-fetch an org we've already resolved).
  const resolvedOrgParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orgParam) return;
    const inList = organizations.find((o) => o.id === orgParam);
    if (inList) {
      setSelectedOrg(inList);
      resolvedOrgParamRef.current = orgParam;
      return;
    }
    if (loading) return; // list still loading — wait for it
    if (resolvedOrgParamRef.current === orgParam) return; // already handled
    resolvedOrgParamRef.current = orgParam;
    let cancelled = false;
    organizationService
      .getById(orgParam)
      .then((org) => {
        if (!cancelled) setSelectedOrg(org);
      })
      .catch(() => {
        // Org no longer exists — leave the panel closed.
      });
    return () => {
      cancelled = true;
    };
  }, [orgParam, organizations, loading]);

  const fetchOrganizations = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const result = await organizationService.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setOrganizations(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchOrganizations(1);
  }, [fetchOrganizations]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await organizationService.update(id, { isActive: !currentActive } as unknown as Record<string, unknown>);
      fetchOrganizations(meta.page);
      selectOrg(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update organization');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage organizations, subscriptions, and tenant configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => fetchOrganizations(meta.page)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-error-light px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations by name or code..."
                className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary focus:border-primary-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="TVET_SCHOOL">TVET School</option>
                <option value="SECONDARY_SCHOOL">Secondary School</option>
                <option value="UNIVERSITY">University</option>
                <option value="COMPANY">Company</option>
                <option value="GOVERNMENT_INSTITUTION">Government</option>
                <option value="NGO">NGO</option>
                <option value="TRAINING_CENTER">Training Center</option>
              </select>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      <div className="flex gap-0 lg:gap-6">
        <div className="flex-1 min-w-0">
          <Card className="!p-0">
            {loading ? (
              <div className="animate-pulse p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-surface-tertiary" />
                ))}
              </div>
            ) : organizations.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Building2 className="h-12 w-12 text-text-tertiary mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-1">No organizations found</h3>
                <p className="text-sm text-text-secondary max-w-sm">
                  {search ? 'Try adjusting your search or filters.' : 'No organizations yet. Organizations are created when a Platform Owner adds an Organization Owner under People → Users & Roles.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <div className="lg:col-span-3 flex items-center gap-1">
                    Organization <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div className="lg:col-span-2">Type</div>
                  <div className="lg:col-span-2">Seats</div>
                  <div className="lg:col-span-2">Status</div>
                  <div className="lg:col-span-2">Subscription</div>
                  <div className="lg:col-span-1 text-right">Actions</div>
                </div>

                {/* Rows */}
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${selectedOrg?.id === org.id ? 'Close' : 'Open'} details for ${org.name}`}
                    aria-expanded={selectedOrg?.id === org.id}
                    className={`grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      selectedOrg?.id === org.id ? 'bg-primary-50' : ''
                    } lg:grid-cols-12 lg:gap-4`}
                    onClick={() => selectOrg(selectedOrg?.id === org.id ? null : org)}
                    onKeyDown={(e) => {
                      // Only act on keys aimed at the row itself — child
                      // controls (e.g. the Details button) handle their own
                      // keys, and their events bubble up to this handler.
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectOrg(selectedOrg?.id === org.id ? null : org);
                      }
                    }}
                  >
                    {/* Mobile layout */}
                    <div className="lg:col-span-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeColor(org.organizationType)}`}>
                          <OrgTypeIcon type={org.organizationType} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{org.name}</p>
                          <p className="text-xs text-text-tertiary">{org.code}</p>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-2 flex items-center">
                      <Badge variant="neutral" size="sm">
                        {orgTypeLabel(org.organizationType)}
                      </Badge>
                    </div>
                    {/* Seats cell — clicking it bubbles to the row's onClick,
                        which opens the org detail panel; the tooltip + cursor
                        make the affordance obvious. */}
                    <div
                      className="lg:col-span-2 flex items-center cursor-pointer"
                      title="View organization details"
                    >
                      <SeatsMeter variant="table" used={org.totalCandidates ?? 0} max={org.maxCandidates} />
                    </div>
                    <div className="lg:col-span-2 flex items-center">
                      {isActiveBadge(org.isActive)}
                    </div>
                    <div className="lg:col-span-2 flex items-center">
                      {statusBadge(org.subscriptionStatus)}
                    </div>
                    <div className="lg:col-span-1 flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<ExternalLink className="h-3.5 w-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectOrg(selectedOrg?.id === org.id ? null : org);
                        }}
                      >
                        Details
                      </Button>
                      <ChevronRight className="h-4 w-4 text-text-tertiary lg:hidden" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-text-tertiary">
                Showing {organizations.length} of {meta.totalItems} organizations
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={meta.page <= 1}
                  onClick={() => fetchOrganizations(meta.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-text-tertiary px-2">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => fetchOrganizations(meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel (desktop) */}
        {selectedOrg && (
          <div className="hidden lg:block">
            <OrganizationDetailPanel
              org={selectedOrg}
              seatTrend={selectedOrgTrend}
              onClose={() => selectOrg(null)}
              onToggleActive={handleToggleActive}
            />
          </div>
        )}
      </div>

      {/* Detail Panel (mobile - as a modal) */}
      {selectedOrg && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => selectOrg(null)}>
          <div
            className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <OrganizationDetailPanel
              org={selectedOrg}
              seatTrend={selectedOrgTrend}
              onClose={() => selectOrg(null)}
              onToggleActive={handleToggleActive}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default InstitutionsPage;
