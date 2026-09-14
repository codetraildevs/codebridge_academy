import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@components/ui/card';
import { api } from '@services/api';
import { useAuthStore } from '@stores/auth-store';
import { Building2, Users, FileCheck, TrendingUp } from 'lucide-react';

interface OrgOverview {
  name: string;
  code: string;
  totalUsers: number;
  totalCandidates: number;
  totalAssessments: number;
  activeSubscriptions: number;
}

export function OrganizationOverviewPage() {
  const user = useAuthStore((s) => s.user);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['org-overview', user?.organizationId],
    queryFn: async () => {
      // There is no /organizations/me route — the overview combines the org
      // profile (name/code) with the org stats (counts), the same way
      // dashboardService.getOrganizationDashboard does.
      const [profileRes, statsRes] = await Promise.all([
        api.get('/organizations/profile'),
        api.get(`/organizations/${user?.organizationId}/stats`),
      ]);
      const profile = profileRes.data.data;
      const stats = statsRes.data.data;
      return {
        name: profile.name,
        code: profile.code,
        totalUsers: stats.totalUsers,
        totalCandidates: stats.totalCandidates,
        totalAssessments: stats.totalExams,
        activeSubscriptions:
          stats.subscriptionStatus === 'ACTIVE' || stats.subscriptionStatus === 'TRIAL' ? 1 : 0,
      } as OrgOverview;
    },
    enabled: !!user?.organizationId,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Organization Overview</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Summary of your organization's activity and resources
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? '—' : overview?.totalUsers ?? 0}</p>
              <p className="text-xs text-text-tertiary">Team Members</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50">
              <Building2 className="h-6 w-6 text-accent-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? '—' : overview?.totalCandidates ?? 0}</p>
              <p className="text-xs text-text-tertiary">Candidates</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? '—' : overview?.totalAssessments ?? 0}</p>
              <p className="text-xs text-text-tertiary">Assessments</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? '—' : overview?.activeSubscriptions ?? 0}</p>
              <p className="text-xs text-text-tertiary">Active Subscriptions</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Organization Details</h3>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-text-tertiary">Name:</span>{' '}
              <span className="text-text-primary">{overview?.name || user?.organizationName || '—'}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Code:</span>{' '}
              <span className="text-text-primary">{overview?.code || '—'}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default OrganizationOverviewPage;
