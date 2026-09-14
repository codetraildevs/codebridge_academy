import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';

import { reportsApi, type OverviewResponse, type PassRatesResponse, type CompetencyScoresResponse, type SubmissionTrendsResponse } from '@services/reports-service';
import { BarChart, DonutChart } from '@pages/dashboard/components/shared/charts';
import { useAuthStore } from '@stores/auth-store';
import { cn } from '@utils/cn';
import { formatDate } from '@utils/format';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Users,
  FileCheck,
  Award,
  GraduationCap,
  RefreshCw,
  Calendar,
  BrainCircuit,
  CheckCircle2,
  AlertCircle,
  Clock,
  Landmark,
  UserCheck,
  Inbox,
} from 'lucide-react';

type ViewTab = 'overview' | 'pass-rates' | 'competency' | 'submissions';

const TAB_ITEMS: { key: ViewTab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'pass-rates', label: 'Pass Rates', icon: TrendingUp },
  { key: 'competency', label: 'Competency', icon: BrainCircuit },
  { key: 'submissions', label: 'Submissions', icon: FileCheck },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const organizationId = user?.organizationId;

  // Deep-linkable view mode (?view=...): candidates | organizations | assessors | performance
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'analytics';

  if (view === 'candidates') return <CandidateReportsView organizationId={organizationId} />;
  if (view === 'organizations') return <OrganizationReportsView />;
  if (view === 'assessors') return <AssessorReportsView organizationId={organizationId} />;
  if (view === 'performance') return <PerformanceAnalyticsView />;
  return <ReportsAnalytics user={user} organizationId={organizationId} />;
}

function ReportsAnalytics({
  user,
  organizationId,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  organizationId?: string | null;
}) {
  void user; // retained for future role-based analytics adjustments

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [passRates, setPassRates] = useState<PassRatesResponse | null>(null);
  const [competency, setCompetency] = useState<CompetencyScoresResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionTrendsResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = organizationId ? { organizationId } : {};
      const [ov, pr, comp, sub] = await Promise.all([
        reportsApi.getOverview(params),
        reportsApi.getPassRates(params),
        reportsApi.getCompetencyScores(params),
        reportsApi.getSubmissionTrends(params),
      ]);
      setOverview(ov);
      setPassRates(pr);
      setCompetency(comp);
      setSubmissions(sub);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reports';
      setFetchError(message);
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  // ── Pass Rates Chart Data ──
  const passRateChartData = useMemo(() => {
    if (!passRates) return [];
    return passRates.monthlyTrend.map((m) => ({
      label: m.month.slice(5),
      Passed: m.passed,
      Failed: m.total - m.passed,
      rate: m.passRate,
    }));
  }, [passRates]);

  // ── Competency Chart Data ──
  const competencyChartData = useMemo(() => {
    if (!competency) return [];
    return competency.competencies.slice(0, 10).map((c) => ({
      label: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
      Score: c.averageScore,
    }));
  }, [competency]);

  // ── Submission Chart Data ──
  const submissionChartData = useMemo(() => {
    if (!submissions) return [];
    return submissions.monthlyTrend.map((m) => ({
      label: m.month.slice(5),
      Submitted: m.total,
      Completed: m.completed,
    }));
  }, [submissions]);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Organization and skills competency analytics
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={refreshing}
          icon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Failed to load reports</p>
            <p className="text-sm text-red-700 mt-0.5">{fetchError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} loading={refreshing}>
            Retry
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><GraduationCap className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{overview.totals.exams}</p><p className="text-xs text-text-secondary">Total Exams</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600"><Users className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{overview.totals.candidates}</p><p className="text-xs text-text-secondary">Candidates</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600"><FileCheck className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{overview.totals.submissions}</p><p className="text-xs text-text-secondary">Submissions</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{overview.totals.activeCertificates}</p><p className="text-xs text-text-secondary">Active Certs</p></div>
              </div>
            </Card>
          </div>

          {/* Pass Rate + Competency Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="outlined">
              <CardHeader><CardTitle>Pass Rate</CardTitle></CardHeader>
              <CardBody className="flex flex-col items-center py-6">
                <p className="text-5xl font-bold text-primary-600">{overview.passRate.passRate}%</p>
                <p className="text-sm text-text-secondary mt-2">
                  {overview.passRate.passed} of {overview.passRate.total} candidates passed
                </p>
                <div className="mt-4 w-full max-w-xs h-2 rounded-full bg-surface-tertiary overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${overview.passRate.passRate}%` }} />
                </div>
              </CardBody>
            </Card>

            <Card variant="outlined">
              <CardHeader><CardTitle>Competency Overview</CardTitle></CardHeader>
              <CardBody className="space-y-4 py-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-text-primary">{overview.competencySummary.overallAverage}%</p>
                  <p className="text-sm text-text-secondary">Average Competency Score</p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  {overview.competencyCategories.slice(0, 5).map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary capitalize">{cat.category.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="font-medium text-text-primary">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ══ PASS RATES TAB ══ */}
      {activeTab === 'pass-rates' && passRates && (
        <div className="space-y-6">
          {/* Overall stat card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600"><TrendingUp className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-success">{passRates.overall.passRate}%</p><p className="text-xs text-text-secondary">Overall Pass Rate</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{passRates.overall.passed}</p><p className="text-xs text-text-secondary">Passed</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><AlertCircle className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{passRates.overall.total - passRates.overall.passed}</p><p className="text-xs text-text-secondary">Failed</p></div>
              </div>
            </Card>
          </div>

          {/* Monthly trend chart */}
          <Card variant="outlined">
            <CardHeader><CardTitle>Monthly Pass Rate Trend</CardTitle></CardHeader>
            <CardBody>
              {passRateChartData.length > 0 ? (
                <div className="space-y-4">
                  <BarChart
                    data={passRateChartData}
                    bars={[
                      { key: 'Passed', color: '#22c55e', label: 'Passed' },
                      { key: 'Failed', color: '#ef4444', label: 'Failed' },
                    ]}
                    height={200}
                  />
                  <div className="flex flex-wrap gap-4 text-xs text-text-tertiary">
                    {passRates.monthlyTrend.map((m) => (
                      <span key={m.month} className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {m.month}: <strong className="text-text-primary">{m.passRate}%</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center">No pass rate data yet</p>
              )}
            </CardBody>
          </Card>

          {/* By Field */}
          {passRates.byField.length > 0 && (
            <Card variant="outlined">
              <CardHeader><CardTitle>Pass Rate by Exam</CardTitle></CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {passRates.byField.map((f, i) => (
                    <div key={f.fieldId} className="flex items-center gap-4">
                      <span className="text-sm text-text-secondary w-8 shrink-0">#{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary truncate">{f.fieldId.slice(0, 8)}…</span>
                          <span className="text-sm font-semibold text-text-primary">{f.passRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-surface-tertiary overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${f.passRate}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ══ COMPETENCY TAB ══ */}
      {activeTab === 'competency' && competency && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><BrainCircuit className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{competency.summary.totalCompetencies}</p><p className="text-xs text-text-secondary">Competencies</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{competency.summary.totalAssessments}</p><p className="text-xs text-text-secondary">Assessments</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-amber-600">{competency.summary.overallAverage}%</p><p className="text-xs text-text-secondary">Average Score</p></div>
              </div>
            </Card>
          </div>

          {/* Category breakdown */}
          {competency.byCategory.length > 0 && (
            <Card variant="outlined">
              <CardHeader><CardTitle>Competency by Category</CardTitle></CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <DonutChart
                    data={competency.byCategory.map((c, i) => ({
                      label: c.category.replace(/_/g, ' ').toLowerCase(),
                      value: Math.round(c.percentage * 100),
                      color: CHART_COLORS[i % CHART_COLORS.length] || '#6366f1',
                    }))}
                    size={180}
                  />
                  <div className="space-y-3">
                    {competency.byCategory.map((cat, i) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-text-secondary capitalize">{cat.category.replace(/_/g, ' ').toLowerCase()}</span>
                          <span className="font-medium text-text-primary">{cat.percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${cat.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Top competencies list */}
          <Card variant="outlined">
            <CardHeader><CardTitle>Top Competencies</CardTitle></CardHeader>
            <CardBody>
              {competencyChartData.length > 0 ? (
                <div className="space-y-4">
                  <BarChart
                    data={competencyChartData}
                    bars={[{ key: 'Score', color: '#6366f1', label: 'Score' }]}
                    height={200}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {competency.competencies.slice(0, 8).map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                          <p className="text-xs text-text-tertiary capitalize">{c.category.replace(/_/g, ' ').toLowerCase()}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-semibold text-text-primary">{c.percentage}%</p>
                          <p className="text-xs text-text-tertiary">{c.totalAssessments} assessments</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center">No competency data available</p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ══ SUBMISSIONS TAB ══ */}
      {activeTab === 'submissions' && submissions && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileCheck className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{submissions.totalSubmissions}</p><p className="text-xs text-text-secondary">Total Submissions</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600"><CheckCircle2 className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-success">{submissions.completionRate}%</p><p className="text-xs text-text-secondary">Completion Rate</p></div>
              </div>
            </Card>
            <Card variant="outlined" padding="md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Clock className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold text-text-primary">{submissions.monthlyTrend.length}</p><p className="text-xs text-text-secondary">Months Tracked</p></div>
              </div>
            </Card>
          </div>

          {/* Monthly trend chart */}
          <Card variant="outlined">
            <CardHeader><CardTitle>Submission Volume</CardTitle></CardHeader>
            <CardBody>
              {submissionChartData.length > 0 ? (
                <BarChart
                  data={submissionChartData}
                  bars={[
                    { key: 'Submitted', color: '#6366f1', label: 'Submitted' },
                    { key: 'Completed', color: '#22c55e', label: 'Completed' },
                  ]}
                  height={200}
                />
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center">No submission data yet</p>
              )}
            </CardBody>
          </Card>

          {/* Score distribution */}
          <Card variant="outlined">
            <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {submissions.scoreDistribution.map((range) => {
                  const maxCount = Math.max(...submissions.scoreDistribution.map((r) => r.count), 1);
                  const pct = (range.count / maxCount) * 100;
                  return (
                    <div key={range.label} className="flex flex-col items-center text-center">
                      <div className="flex items-end h-24 mb-2">
                        <div
                          className="w-12 rounded-t-lg bg-primary-500 transition-all"
                          style={{ height: `${pct || 2}%` }}
                        />
                      </div>
                      <p className="text-lg font-bold text-text-primary">{range.count}</p>
                      <p className="text-xs text-text-tertiary">{range.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Dedicated views (deep-linked from the sidebar) ──

function useReportRows<T>(key: string[], fetcher: () => Promise<{ data: T[]; meta: { totalItems: number } }>) {
  const query = useQuery({
    queryKey: key,
    queryFn: fetcher,
  });
  return { rows: query.data?.data ?? ([] as T[]), total: query.data?.meta.totalItems ?? 0, ...query };
}

function ReportTableShell({ title, subtitle, loading, error, onRetry, total, children }: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  total: number;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
      <Card className="!p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-text-tertiary">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">Couldn't load this report.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="h-8 w-8 text-text-tertiary" />
            <p className="mt-3 text-sm text-text-secondary">No data available yet.</p>
          </div>
        ) : (
          children
        )}
      </Card>
    </div>
  );
}

// ── Candidate Reports ──
function CandidateReportsView({ organizationId }: { organizationId?: string | null }) {
  const { rows, total, isLoading, isError, refetch } = useReportRows(
    ['report-candidates', organizationId ?? ''],
    () => reportsApi.getCandidateReports({ organizationId: organizationId ?? undefined }),
  );
  return (
    <ReportTableShell
      title="Candidate Reports"
      subtitle="Per-candidate assessment results, pass rates, and average scores"
      loading={isLoading}
      error={isError}
      onRetry={() => refetch()}
      total={total}
    >
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        <div className="lg:col-span-4">Candidate</div>
        <div className="lg:col-span-2">Assessments</div>
        <div className="lg:col-span-2">Passed</div>
        <div className="lg:col-span-2">Pass Rate</div>
        <div className="lg:col-span-2">Avg Score</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r: any) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
            <div className="lg:col-span-4 min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{r.firstName} {r.lastName}</p>
              <p className="truncate text-xs text-text-tertiary">{r.email}</p>
            </div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.assessmentsTaken}</div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.passed}</div>
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full bg-surface-tertiary overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${r.passRate}%` }} />
                </div>
                <span className="text-xs font-medium text-text-primary">{r.passRate}%</span>
              </div>
            </div>
            <div className="lg:col-span-2 text-sm font-medium text-text-primary">{r.averageScore}</div>
          </div>
        ))}
      </div>
    </ReportTableShell>
  );
}

// ── Organization Reports (platform owner) ──
function OrganizationReportsView() {
  const { rows, total, isLoading, isError, refetch } = useReportRows(['report-organizations'], () =>
    reportsApi.getOrganizationReports(),
  );
  return (
    <ReportTableShell
      title="Organization Reports"
      subtitle="Usage and results across all organizations"
      loading={isLoading}
      error={isError}
      onRetry={() => refetch()}
      total={total}
    >
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        <div className="lg:col-span-3">Organization</div>
        <div className="lg:col-span-2">Users</div>
        <div className="lg:col-span-2">Candidates</div>
        <div className="lg:col-span-2">Exams</div>
        <div className="lg:col-span-2">Completed</div>
        <div className="lg:col-span-1">Pass Rate</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r: any) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
            <div className="lg:col-span-3 min-w-0">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 shrink-0 text-text-tertiary" />
                <p className="truncate text-sm font-medium text-text-primary">{r.name}</p>
              </div>
              <p className="pl-6 truncate text-xs text-text-tertiary">{r.code}</p>
            </div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.totalUsers}</div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.totalCandidates}</div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.totalExams}</div>
            <div className="lg:col-span-2 text-sm text-text-secondary">{r.assessmentsCompleted}</div>
            <div className="lg:col-span-1">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', r.passRate >= 50 ? 'bg-accent-50 text-accent-700' : 'bg-amber-50 text-amber-700')}>
                {r.passRate}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </ReportTableShell>
  );
}

// ── Assessor Reports ──
function AssessorReportsView({ organizationId }: { organizationId?: string | null }) {
  const { rows, total, isLoading, isError, refetch } = useReportRows(
    ['report-assessors', organizationId ?? ''],
    () => reportsApi.getAssessorReports({ organizationId: organizationId ?? undefined }),
  );
  return (
    <ReportTableShell
      title="Assessor Reports"
      subtitle="Review workload and scoring performance per assessor"
      loading={isLoading}
      error={isError}
      onRetry={() => refetch()}
      total={total}
    >
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        <div className="lg:col-span-5">Assessor</div>
        <div className="lg:col-span-3">Reviews Completed</div>
        <div className="lg:col-span-2">Avg Score</div>
        <div className="lg:col-span-2">Last Reviewed</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r: any) => (
          <div key={r.id} className="grid grid-cols-1 gap-2 px-5 py-3.5 lg:grid-cols-12 lg:gap-4 lg:items-center">
            <div className="lg:col-span-5 min-w-0">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0 text-text-tertiary" />
                <p className="truncate text-sm font-medium text-text-primary">{r.firstName} {r.lastName}</p>
              </div>
              <p className="pl-6 truncate text-xs text-text-tertiary">{r.email}</p>
            </div>
            <div className="lg:col-span-3 text-sm text-text-secondary">{r.reviewsCompleted}</div>
            <div className="lg:col-span-2 text-sm font-medium text-text-primary">{r.averageScore}</div>
            <div className="lg:col-span-2 text-xs text-text-tertiary">
              {r.lastReviewedAt ? formatDate(r.lastReviewedAt, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            </div>
          </div>
        ))}
      </div>
    </ReportTableShell>
  );
}

// ── Performance Analytics ──
function PerformanceAnalyticsView() {
  const user = useAuthStore((s) => s.user);
  return <ReportsAnalytics user={user} organizationId={user?.organizationId} />;
}

export default ReportsPage;
