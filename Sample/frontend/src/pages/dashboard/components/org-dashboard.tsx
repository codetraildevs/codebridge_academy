import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { SeatsMeter } from '@components/ui/seats-meter';
import type { OrgDashboardData } from '@services/dashboard-service';
import { SeatUsageTrend } from './shared/seat-usage-trend';
import {
  Users,
  UserCheck,
  FileCheck,
  Plus,
  Settings,
  BarChart3,
  GraduationCap,
  ClipboardCheck,
  Award,
} from 'lucide-react';
import { StatCard } from './shared/stat-card';

export function OrgDashboard({ data }: { data: OrgDashboardData }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{data.orgName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Organization dashboard · <span className="capitalize">{data.orgType.replace(/_/g, ' ').toLowerCase()}</span>
            {data.subscriptionStatus && (
              <Badge variant={data.subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'} size="sm" className="ml-2">
                {data.subscriptionStatus}
              </Badge>
            )}
            {/* Seat quota at a glance — same source as the Subscription card */}
            <SeatsMeter variant="chip" used={data.totalCandidates} max={data.maxCandidates} className="ml-2" />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Users" value={data.totalUsers} icon={Users} color="text-primary-600" bgColor="bg-primary-50" />
        <StatCard label="Candidates" value={data.totalCandidates} icon={UserCheck} color="text-secondary-600" bgColor="bg-secondary-50" />
        <StatCard label="Total Exams" value={data.totalExams} icon={FileCheck} color="text-accent-600" bgColor="bg-accent-50" trend={{ value: `${data.activeExams} active`, positive: true }} onClick={() => navigate('/exams')} />
        <StatCard label="Assessments Done" value={data.completedAssessments} icon={ClipboardCheck} color="text-warning" bgColor="bg-warning-light" onClick={() => navigate('/assessments')} />
        <StatCard label="Certificates" value={data.totalCertificates} icon={Award} color="text-info" bgColor="bg-info-light" onClick={() => navigate('/certificates')} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="text-center p-4">
                <p className="text-4xl font-bold text-text-primary">{data.averageScore || '-'}%</p>
                <p className="text-sm text-text-secondary mt-1">Average Score</p>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Pass Rate</span>
                  <span className="text-lg font-semibold text-accent-600">{data.passRate?.toFixed(1) || '-'}%</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {data.usage && (
          <Card>
            <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Plan</span><span className="text-sm font-medium text-text-primary">{data.usage.planName || 'N/A'}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Billing</span><span className="text-sm font-medium text-text-primary">{data.usage.billingCycle}</span></div>
              <div className="pt-2">
                <SeatsMeter
                  variant="card"
                  used={data.totalCandidates}
                  max={data.maxCandidates}
                  label="Candidate Seats"
                  showLimitHint
                  limitHintAction={
                    <button
                      type="button"
                      onClick={() => navigate('/settings/plans')}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      Upgrade plan
                    </button>
                  }
                />
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary">Assessments Used</span>
                  <span className="font-medium text-text-primary">{data.usage.totalAssessmentsUsed} / {data.usage.maxAssessments >= 999999 ? 'Unlimited' : data.usage.maxAssessments}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500 transition-all duration-500"
                    style={{ width: `${Math.min((data.usage.totalAssessmentsUsed / Math.max(data.usage.maxAssessments, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Button fullWidth variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/exams')}>Create Exam</Button>
            <Button fullWidth variant="secondary" icon={<Users className="h-4 w-4" />} onClick={() => navigate('/candidates')}>Manage Candidates</Button>
            <Button fullWidth variant="secondary" icon={<GraduationCap className="h-4 w-4" />} onClick={() => navigate('/assessments')}>View Assessments</Button>
            <Button fullWidth variant="secondary" icon={<BarChart3 className="h-4 w-4" />} onClick={() => navigate('/reports')}>View Reports</Button>
            <Button fullWidth variant="secondary" icon={<Settings className="h-4 w-4" />} onClick={() => navigate('/settings')}>Org Settings</Button>
          </CardBody>
        </Card>
      </div>

      {/* Seat usage trend — this org's own candidates over 6 months (one
          Candidate row per seat). The card itself renders nothing when the
          trend is empty. */}
      <SeatUsageTrend
        trend={data.seatUsageTrend}
        bars={[
          { key: 'seatsConsumed', color: '#10B981', monthlyLabel: 'Seats consumed', cumulativeLabel: 'Seats in use' },
        ]}
        footnoteMonthly="Candidates created per month = seats consumed by this org (one Candidate row per seat)"
        footnoteCumulative="Seats in use = running total of candidates created by this org (one Candidate row per seat)"
      />
    </div>
  );
}
