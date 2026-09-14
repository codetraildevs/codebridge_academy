import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { SeatsMeter } from '@components/ui/seats-meter';
import { useRoles, getRoleDisplayName } from '@hooks/use-roles';
import type { PlatformOverview } from '@services/dashboard-service';
import {
  Building2,
  Users,
  UserCheck,
  FileCheck,
  CreditCard,
  BarChart3,
  Activity,
  GraduationCap,
  ClipboardCheck,
  Shield,
} from 'lucide-react';
import { StatCard } from './shared/stat-card';
import { BarChart, DonutChart } from './shared/charts';
import { SeatUsageTrend } from './shared/seat-usage-trend';
import { timeAgo, formatUptime, severityColor, SeverityIcon } from './shared/helpers';

// ── Dynamic Role Distribution (labels from API) ─

function DynamicRoleDistribution({ users: u }: { users: PlatformOverview['users'] }) {
  const { data: roles } = useRoles();

  const roleEntries: Array<{ roleName: string; value: number; color: string; bg: string }> = [
    { roleName: 'PLATFORM_OWNER', value: u.platformOwners, color: 'text-primary-600', bg: 'bg-primary-50' },
    { roleName: 'ORGANIZATION_OWNER', value: u.organizationOwners, color: 'text-secondary-600', bg: 'bg-secondary-50' },
    { roleName: 'ADMIN', value: u.admins, color: 'text-accent-600', bg: 'bg-accent-50' },
    { roleName: 'DESIGNER', value: u.designers, color: 'text-info', bg: 'bg-info-light' },
    { roleName: 'ASSESSOR', value: u.assessors, color: 'text-warning', bg: 'bg-warning-light' },
    { roleName: 'ORGANIZATION_REVIEWER', value: u.reviewers, color: 'text-error', bg: 'bg-error-light' },
    { roleName: 'CANDIDATE', value: u.candidates, color: 'text-primary-600', bg: 'bg-primary-50' },
    { roleName: 'INDIVIDUAL_CANDIDATE', value: u.individualCandidates, color: 'text-secondary-600', bg: 'bg-secondary-50' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>User Role Distribution</CardTitle></CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {roleEntries.map((item) => {
            const label = getRoleDisplayName(item.roleName, roles);
            return (
              <div key={item.roleName} className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}>
                  <Users className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-text-primary">{item.value}</p>
                  <p className="text-xs text-text-tertiary">{label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Org Seats Summary Strip ──────────────────────

function SeatUsageStrip({ seatUsage }: { seatUsage: PlatformOverview['seatUsage'] }) {
  const navigate = useNavigate();
  const pct =
    seatUsage.totalSeats > 0 ? Math.round((seatUsage.seatsUsed / seatUsage.totalSeats) * 100) : 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>Total Seats</CardTitle></CardHeader>
        <CardBody>
          <p className="text-2xl font-bold text-text-primary">{seatUsage.totalSeats.toLocaleString()}</p>
          <p className="mt-1 text-xs text-text-tertiary">Across capped plans</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Seats Used</CardTitle></CardHeader>
        <CardBody>
          <p className="text-2xl font-bold text-text-primary">
            {seatUsage.seatsUsed.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-text-tertiary">({pct}%)</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct >= 95 ? 'bg-error' : pct >= 80 ? 'bg-warning' : 'bg-primary-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Orgs Near Capacity</CardTitle></CardHeader>
        <CardBody>
          {seatUsage.nearCapacity.length === 0 ? (
            <p className="text-sm text-text-secondary">No orgs at 80%+ seat usage</p>
          ) : (
            <div className="space-y-1">
              {seatUsage.nearCapacity.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(`/organizations?org=${o.id}`)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-tertiary"
                >
                  <span className="min-w-0 truncate text-sm text-text-primary">{o.name}</span>
                  <span className="shrink-0 text-xs font-medium text-error">
                    {o.used}/{o.max >= 999999 ? '∞' : o.max}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ── Monthly Breakdown Strip ──────────────────────

function MonthlyBreakdownStrip({
  month,
  registrations,
}: {
  month: string;
  registrations: PlatformOverview['monthlyRegistrations'];
}) {
  const entry = registrations.find((m) => m.month.slice(0, 3) === month);
  if (!entry) return null;
  const stats = [
    { label: 'Orgs', value: entry.organizations },
    { label: 'Users', value: entry.users },
    { label: 'Candidates', value: entry.candidates },
  ];
  return (
    <div className="mt-4 rounded-lg bg-surface-secondary p-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">
          {month} {entry.year} breakdown
        </p>
        <span className="text-xs text-text-tertiary">Registrations</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-white px-3 py-2 text-center">
            <p className="text-lg font-bold text-text-primary">{s.value}</p>
            <p className="text-[11px] text-text-tertiary">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Orgs by Seat Usage ───────────────────────

function TopOrgsBySeats({ seatUsage }: { seatUsage: PlatformOverview['seatUsage'] }) {
  const navigate = useNavigate();
  if (seatUsage.topByUsage.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Top Orgs by Seat Usage</CardTitle></CardHeader>
      <CardBody className="space-y-1">
        {seatUsage.topByUsage.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => navigate(`/organizations?org=${o.id}`)}
            className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-surface-tertiary"
          >
            <span className="min-w-0 truncate text-sm font-medium text-text-primary">{o.name}</span>
            <SeatsMeter variant="table" used={o.used} max={o.max} />
          </button>
        ))}
      </CardBody>
    </Card>
  );
}

// ── PLATFORM_OWNER Dashboard ─────────────────────

export function PlatformOwnerDashboard({ overview, user }: { overview: PlatformOverview; user: any }) {
  const navigate = useNavigate();
  const { organizations, users: u, candidates, exams } = overview;

  // Cross-card drill-down: clicking a month on the Seat Usage Trend chart
  // scrolls to the Monthly Registrations card and highlights that month's bars.
  const [highlightedMonth, setHighlightedMonth] = useState<string | null>(null);
  const monthlyRegRef = useRef<HTMLDivElement>(null);
  const handleMonthSelect = (month: string) => {
    setHighlightedMonth(month);
    // Tests stub Element.prototype.scrollIntoView; browsers implement it.
    monthlyRegRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const orgColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

  const orgDistribution = Object.entries(overview.organizations.byType ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7);
  const orgChartData = orgDistribution.map(([type, count], i) => ({
    label: type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: count,
    color: orgColors[i % orgColors.length] ?? '#3B82F6',
  }));

  const planChartData = (overview.subscriptions.planDistribution ?? []).map((p, i) => ({
    label: p.planName,
    value: p.count,
    color: orgColors[(i + 2) % orgColors.length] ?? '#8B5CF6',
  }));

  const monthlyData = (overview.monthlyRegistrations ?? []).map((m) => ({
    label: `${m.month.slice(0, 3)}`,
    organizations: m.organizations,
    users: m.users,
    candidates: m.candidates,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Platform Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Welcome back, {user?.firstName || 'Platform Owner'}! Here's your platform overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" dot>System Online</Badge>
          <span className="text-xs text-text-tertiary">Uptime: {formatUptime(overview.platformHealth.uptime ?? 0)}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Organizations" value={organizations.total} icon={Building2} color="text-primary-600" bgColor="bg-primary-50" trend={{ value: `${organizations.newThisMonth} this month`, positive: true }} onClick={() => navigate('/organizations')} />
        <StatCard label="Total Users" value={u.total} icon={Users} color="text-secondary-600" bgColor="bg-secondary-50" trend={{ value: `${u.activeUsers} active`, positive: u.activeUsers > 0 }} />
        <StatCard label="Candidates" value={candidates.total} icon={UserCheck} color="text-accent-600" bgColor="bg-accent-50" trend={{ value: `${candidates.active} active`, positive: true }} />
        <StatCard label="Exams" value={exams.total} icon={FileCheck} color="text-primary-600" bgColor="bg-primary-50" trend={{ value: `${exams.published} published`, positive: true }} onClick={() => navigate('/exams')} />
        <StatCard label="Assessments Done" value={overview.platformHealth.completedAssessments ?? 0} icon={ClipboardCheck} color="text-accent-600" bgColor="bg-accent-50" trend={{ value: `${exams.inProgress} in progress`, positive: true }} onClick={() => navigate('/assessments')} />
        <StatCard label="Active Subscriptions" value={overview.subscriptions.totalActiveSubscriptions ?? 0} icon={CreditCard} color="text-info" bgColor="bg-info-light" />
      </div>

      {/* Org Seats — summary strip + trend + top orgs (per-org seat data from the overview) */}
      {overview.seatUsage && (
        <>
          <SeatUsageStrip seatUsage={overview.seatUsage} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SeatUsageTrend
              trend={overview.seatUsageTrend ?? []}
              bars={[
                { key: 'orgsAdded', color: '#3B82F6', monthlyLabel: 'Orgs added', cumulativeLabel: 'Cumulative orgs' },
                { key: 'seatsConsumed', color: '#10B981', monthlyLabel: 'Seats consumed', cumulativeLabel: 'Seats in use' },
              ]}
              footnoteMonthly="Candidates created per month = seats consumed (one Candidate row per seat)"
              footnoteCumulative="Seats in use = running total of candidates created (one Candidate row per seat)"
              onMonthSelect={handleMonthSelect}
            />
            <TopOrgsBySeats seatUsage={overview.seatUsage} />
          </div>
        </>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div ref={monthlyRegRef} className="scroll-mt-6">
          <Card className={highlightedMonth ? 'ring-2 ring-primary-500' : ''}>
            <CardHeader>
              <CardTitle>Monthly Registrations</CardTitle>
              <div className="flex items-center gap-3 text-xs text-text-tertiary">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary-500" /> Orgs</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary-500" /> Users</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-500" /> Candidates</span>
              </div>
            </CardHeader>
            <CardBody>
              <BarChart
                data={monthlyData}
                bars={[
                  { key: 'organizations', color: '#3B82F6', label: 'Organizations' },
                  { key: 'users', color: '#8B5CF6', label: 'Users' },
                  { key: 'candidates', color: '#10B981', label: 'Candidates' },
                ]}
                height={180}
                highlightLabel={highlightedMonth}
              />
              {highlightedMonth && (
                <MonthlyBreakdownStrip
                  month={highlightedMonth}
                  registrations={overview.monthlyRegistrations}
                />
              )}
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Organization Types</CardTitle></CardHeader>
          <CardBody><DonutChart data={orgChartData} size={160} /></CardBody>
        </Card>
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-1">
              {overview.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Activity className="h-10 w-10 text-text-tertiary mb-2" />
                  <p className="text-sm text-text-secondary">No recent activity</p>
                </div>
              ) : (
                overview.recentActivity.map((activity) => (
                  <div key={activity.id} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-tertiary transition-colors">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${severityColor(activity.severity)}/10`}>
                      <span className={severityColor(activity.severity)}><SeverityIcon severity={activity.severity} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary truncate block">{activity.action}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.userName && <span className="text-xs font-medium text-text-tertiary">{activity.userName}</span>}
                        <span className="text-xs text-text-tertiary">{timeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Button fullWidth variant="secondary" icon={<Building2 className="h-4 w-4" />} onClick={() => navigate('/organizations')}>Manage Organizations</Button>
            <Button fullWidth variant="secondary" icon={<CreditCard className="h-4 w-4" />} onClick={() => navigate('/settings/plans')}>Manage Plans</Button>
            <Button fullWidth variant="secondary" icon={<FileCheck className="h-4 w-4" />} onClick={() => navigate('/exams')}>View Exams</Button>
            <Button fullWidth variant="secondary" icon={<GraduationCap className="h-4 w-4" />} onClick={() => navigate('/assessments')}>View Assessments</Button>
            <Button fullWidth variant="secondary" icon={<BarChart3 className="h-4 w-4" />} onClick={() => navigate('/reports')}>View Reports</Button>
            <Button fullWidth variant="secondary" icon={<Shield className="h-4 w-4" />} onClick={() => navigate('/audit-logs')}>Audit Logs</Button>

            <div className="mt-4 rounded-lg bg-surface-secondary p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Platform Health</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Version</span><span className="font-medium text-text-primary">v{overview.platformHealth.version}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Organizations</span><span className="font-medium text-text-primary">{overview.platformHealth.activeOrganizations} / {overview.platformHealth.totalOrganizations} active</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Users</span><span className="font-medium text-text-primary">{overview.platformHealth.activeUsers} active</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Published Exams</span><span className="font-medium text-text-primary">{overview.platformHealth.publishedExams}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-secondary">Assessments Done</span><span className="font-medium text-text-primary">{overview.platformHealth.completedAssessments}</span></div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* User Role Distribution — labels fetched dynamically from DB */}
      <DynamicRoleDistribution users={u} />

      {/* Subscription Distribution */}
      {planChartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Subscription Plans</CardTitle></CardHeader>
          <CardBody>
            <div className="flex flex-wrap items-center gap-6">
              <DonutChart data={planChartData} size={120} />
              <div className="flex flex-wrap gap-4">
                {planChartData.map((p) => (
                  <div key={p.label} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm text-text-secondary">{p.label}</span>
                    <span className="text-sm font-medium text-text-primary">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
