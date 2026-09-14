import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { securityApi, type SecurityEventRow } from '@services/security-service';
import { Shield, Users, ShieldCheck, Activity, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@utils/format';

const PAGE_SIZE = 20;

function severityVariant(severity: string): 'warning' | 'error' | 'info' | 'neutral' {
  if (severity === 'CRITICAL' || severity === 'ERROR') return 'error';
  if (severity === 'WARNING') return 'warning';
  return 'info';
}

export function SecurityPage() {
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['security-overview'],
    queryFn: securityApi.getOverview,
  });

  const { data: eventsData, isLoading: loadingEvents } = useQuery({
    queryKey: ['security-events', page],
    queryFn: () => securityApi.listEvents({ page, limit: PAGE_SIZE }),
  });

  const stats = overview?.stats;
  const events = eventsData?.data ?? [];
  const meta = eventsData?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Security</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform security posture, MFA adoption, and security events
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total accounts"
          value={stats?.totalUsers}
          loading={loadingOverview}
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="MFA adoption"
          value={stats ? `${stats.mfaAdoptionRate}%` : undefined}
          sub={stats ? `${stats.mfaEnabledUsers} of ${stats.totalUsers} users` : undefined}
          loading={loadingOverview}
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Active accounts"
          value={stats?.activeUsers}
          loading={loadingOverview}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Security events"
          value={stats?.securityEvents}
          loading={loadingOverview}
        />
      </div>

      {/* Severity breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Event Severity Breakdown</CardTitle>
        </CardHeader>
        <CardBody>
          {loadingOverview || !overview ? (
            <p className="text-sm text-text-tertiary">Loading...</p>
          ) : overview.severityBreakdown.length === 0 ? (
            <p className="text-sm text-text-secondary">No security events recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {overview.severityBreakdown.map((s) => (
                <div key={s.severity} className="flex items-center gap-2 rounded-lg bg-surface-secondary px-4 py-3">
                  <Badge variant={severityVariant(s.severity)} size="md">{s.severity}</Badge>
                  <span className="text-lg font-semibold text-text-primary">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent security events */}
      <Card className="!p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-text-primary">Security Events</h3>
          </div>
        </div>
        {loadingEvents ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Shield className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No security events found.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {events.map((event: SecurityEventRow) => (
                <div key={event.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-light">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{event.action}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      {event.entity && <span>{event.entity}</span>}
                      {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                      <span>{formatDate(event.timestamp, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <Badge variant={severityVariant(event.severity)} size="sm">{event.severity}</Badge>
                </div>
              ))}
            </div>

            {(meta?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  Page {meta?.page} of {meta?.totalPages} · {meta?.totalItems} events
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

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <Card variant="outlined" padding="lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
          {loading ? (
            <p className="text-lg font-semibold text-text-primary">…</p>
          ) : (
            <p className="text-lg font-semibold text-text-primary">{value ?? '—'}</p>
          )}
          {sub && <p className="truncate text-xs text-text-tertiary">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default SecurityPage;
