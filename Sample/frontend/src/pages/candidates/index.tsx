import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { candidateService, type CandidateProfile } from '@services/candidate-service';
import { organizationService } from '@services/organization-service';
import { AssessmentQuotaBanner } from '@components/subscription/assessment-quota-banner';
import { useOrgUsage } from '@hooks/use-org-usage';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import { Users as UsersIcon, Search, UserPlus, ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 20;
const MANAGER_ROLES = ['ORGANIZATION_OWNER', 'ADMIN'];

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || 'C')[0]}${(lastName || 'D')[0]}`.toUpperCase();
}

interface AddCandidateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

function AddCandidateForm({ onCreated, onCancel }: AddCandidateFormProps) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^\S+@\S+\.\S+$/.test(form.email) &&
    form.password.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await candidateService.createCandidate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      setCreated(`${result.email} registered as ${result.registrationNumber}`);
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create candidate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Add candidate with login</h3>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Creates a CANDIDATE account — the candidate can sign in to the portal
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary"
            aria-label="Close add candidate form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="e.g. Alice"
            fullWidth
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="e.g. Uwimana"
            fullWidth
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="candidate@org.com"
            fullWidth
          />
          <Input
            label="Password"
            type={passwordVisible ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min 8 characters"
            hint="They'll use this to sign in"
            showPasswordToggle
            passwordVisible={passwordVisible}
            onPasswordToggle={() => setPasswordVisible(!passwordVisible)}
            fullWidth
          />
          <Input
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+2507..."
            fullWidth
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-error" role="alert">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {created && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-accent-700">
            <CheckCircle2 className="h-4 w-4" />
            {created}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            Create candidate
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const isManager = user ? MANAGER_ROLES.includes(user.role) : false;
  // Platform owner sees every org's candidates — with the org shown and an
  // org filter, so they can scope the list to "users belonging to that org".
  const isPlatformOwner = user?.role === 'PLATFORM_OWNER';

  // Organization subscription quota (maxCandidates) — governs how many
  // candidates the org may add.
  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile'],
    queryFn: () => organizationService.getProfile(),
    enabled: isManager,
  });

  // Org options for the platform owner's filter dropdown. The API caps the list
  // page size at 100, so request exactly that many.
  const { data: organizations } = useQuery({
    queryKey: ['organizations-options'],
    queryFn: () => organizationService.list({ limit: 100 }),
    enabled: isPlatformOwner,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['candidates', page, debouncedSearch, organizationId],
    queryFn: () =>
      candidateService.listCandidates({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        organizationId: organizationId || undefined,
      }),
  });

  const candidates = data?.data ?? [];
  const meta = data?.meta;

  // Seat usage: meta.totalItems is the org-wide count only when no search is
  // active — cache it so the meter stays correct while searching.
  const [seatsUsed, setSeatsUsed] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (data && !debouncedSearch) setSeatsUsed(data.meta.totalItems);
  }, [data, debouncedSearch]);

  const maxCandidates = orgProfile?.maxCandidates;
  const atCapacity =
    maxCandidates !== undefined && seatsUsed !== undefined && seatsUsed >= maxCandidates;

  // Org assessment-volume quota (registrations used vs plan.maxAssessments) —
  // visible here where candidates are managed and bulk enrollment is prepared.
  const orgUsage = useOrgUsage();

  // Subscription gate — only actively subscribed (or trialing) orgs may add
  // candidates. Undefined while the profile is still loading = not blocked yet.
  const canCreateCandidates =
    orgProfile !== undefined &&
    orgProfile.isActive &&
    (orgProfile.subscriptionStatus === 'ACTIVE' || orgProfile.subscriptionStatus === 'TRIAL');
  const creationBlocked = orgProfile !== undefined && !canCreateCandidates;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Candidates</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your organization's candidates and their assessment accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isManager && maxCandidates !== undefined && seatsUsed !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                atCapacity ? 'bg-error-light text-error' : 'bg-surface-secondary text-text-secondary',
              )}
              title={
                atCapacity
                  ? 'Your subscription limit is reached — upgrade to add more candidates'
                  : `Subscription allows ${maxCandidates} candidate seats`
              }
            >
              <UsersIcon className="h-3.5 w-3.5" />
              {seatsUsed} / {maxCandidates} candidate seats
            </span>
          )}
          {isManager && creationBlocked && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-error-light px-3 py-1 text-xs font-medium text-error"
              title="Renew or upgrade your subscription to add candidates"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {orgProfile?.isActive
                ? `Subscription ${orgProfile.subscriptionStatus} — adding disabled`
                : 'Organization deactivated — adding disabled'}
            </span>
          )}
          {isManager && !showAdd && (
            <Button
              variant="primary"
              icon={<UserPlus className="h-4 w-4" />}
              onClick={() => setShowAdd(true)}
              disabled={atCapacity || creationBlocked}
              title={creationBlocked ? 'Renew or upgrade your subscription to add candidates' : undefined}
            >
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      {/* Org assessment-volume quota banner */}
      <AssessmentQuotaBanner usage={orgUsage} />

      {showAdd && (
        <AddCandidateForm
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Search (+ org filter for platform owner) */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates by name, email, or registration..."
                aria-label="Search candidates"
                className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {isPlatformOwner && (
              <div className="flex items-center gap-2">
                <label htmlFor="org-filter" className="text-sm text-text-tertiary">
                  Organization
                </label>
                <select
                  id="org-filter"
                  value={organizationId}
                  onChange={(e) => {
                    setOrganizationId(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">All organizations</option>
                  {organizations?.data.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Candidates list */}
      <Card className="!p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            Loading candidates...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UsersIcon className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load candidates.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UsersIcon className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              {isManager ? 'No candidates yet' : 'No candidates found'}
            </p>
            <p className="mt-1 max-w-md text-sm text-text-secondary">
              {isManager
                ? "Add your first candidate — they'll get an account they can use to sign in and take assessments."
                : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <div className={cn('lg:col-span-4', isPlatformOwner && 'lg:col-span-3')}>Candidate</div>
              {isPlatformOwner && <div className="lg:col-span-3">Organization</div>}
              <div className={cn('lg:col-span-3', isPlatformOwner && 'lg:col-span-2')}>Registration</div>
              <div className="lg:col-span-2">Field</div>
              <div className={cn('lg:col-span-2', isPlatformOwner && 'lg:col-span-1')}>Status</div>
              <div className="lg:col-span-1">Added</div>
            </div>
            <div className="divide-y divide-border">
              {candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  showOrganization={isPlatformOwner}
                />
              ))}
            </div>

            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} candidates
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

function CandidateRow({
  candidate,
  showOrganization,
}: {
  candidate: CandidateProfile;
  showOrganization: boolean;
}) {
  const canLogin = candidate.user !== null && candidate.user.isActive;
  return (
    <div className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
      <div
        className={cn(
          'flex items-center gap-3',
          showOrganization ? 'lg:col-span-3' : 'lg:col-span-4',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
          {getInitials(candidate.firstName, candidate.lastName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">
            {candidate.firstName} {candidate.lastName}
          </p>
          <p className="truncate text-xs text-text-tertiary">{candidate.email}</p>
        </div>
      </div>
      {showOrganization && (
        <div className="lg:col-span-3 truncate text-sm text-text-secondary">
          {candidate.organization?.name ?? 'Self-registered'}
        </div>
      )}
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-text-secondary',
          showOrganization ? 'lg:col-span-2' : 'lg:col-span-3',
        )}
      >
        <span className="font-mono text-xs">{candidate.registrationNumber}</span>
        {canLogin && (
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-medium text-accent-700">
            has login
          </span>
        )}
      </div>
      <div className="lg:col-span-2 truncate text-sm text-text-secondary">
        {candidate.field?.name ?? '—'}
      </div>
      <div
        className={cn(
          'flex items-start',
          showOrganization ? 'lg:col-span-1' : 'lg:col-span-2',
        )}
      >
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            candidate.status === 'ACTIVE'
              ? 'bg-accent-50 text-accent-700'
              : 'bg-surface-tertiary text-text-tertiary',
          )}
        >
          {candidate.status}
        </span>
      </div>
      <div className="lg:col-span-1 text-xs text-text-tertiary">
        {formatDate(candidate.createdAt, { year: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}

export default CandidatesPage;
