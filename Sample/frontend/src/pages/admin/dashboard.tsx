import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { adminService, type PlatformStats } from '@services/admin-service';
import {
  Building2,
  Users,
  UserCheck,
  FileCheck,
  Award,
  CreditCard,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load platform stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-text-secondary">Loading platform data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Organizations',
      value: stats?.organizations.total ?? 0,
      sub: `${stats?.organizations.pending ?? 0} pending approval`,
      icon: Building2,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Total Users',
      value: stats?.users.total ?? 0,
      sub: 'across all organizations',
      icon: Users,
      color: 'text-secondary-600',
      bg: 'bg-secondary-50',
    },
    {
      label: 'Candidates',
      value: stats?.candidates.total ?? 0,
      sub: 'registered on platform',
      icon: UserCheck,
      color: 'text-accent-600',
      bg: 'bg-accent-50',
    },
    {
      label: 'Exams Created',
      value: stats?.exams.total ?? 0,
      sub: `${stats?.exams.published ?? 0} published`,
      icon: FileCheck,
      color: 'text-info',
      bg: 'bg-info-light',
    },
    {
      label: 'Certificates',
      value: stats?.certificates.total ?? 0,
      sub: 'issued to candidates',
      icon: Award,
      color: 'text-warning',
      bg: 'bg-warning-light',
    },
    {
      label: 'Active Plans',
      value: stats?.subscriptions.activePlans ?? 0,
      sub: 'subscription plans',
      icon: CreditCard,
      color: 'text-success',
      bg: 'bg-success-light',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Platform Overview</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Welcome to the Qualexas admin dashboard
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadStats}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="md">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-text-tertiary">{stat.label}</p>
                  <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">{stat.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            Platform Quick Actions
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/organizations?status=PENDING"
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-light">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Pending Approvals</p>
                <p className="text-xs text-text-tertiary">{stats?.organizations.pending ?? 0} organizations</p>
              </div>
            </a>

            <a
              href="/admin/organizations"
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <Building2 className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Organizations</p>
                <p className="text-xs text-text-tertiary">Manage all orgs</p>
              </div>
            </a>

            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-50">
                <Users className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Users</p>
                <p className="text-xs text-text-tertiary">Manage all users</p>
              </div>
            </a>

            <a
              href="/admin/exams"
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-light">
                <FileCheck className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Exams</p>
                <p className="text-xs text-text-tertiary">Manage & create exams</p>
              </div>
            </a>

            <a
              href="/admin/subscription-plans"
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-all hover:border-primary-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                <CreditCard className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Plans</p>
                <p className="text-xs text-text-tertiary">Manage subscription plans</p>
              </div>
            </a>
          </div>
        </CardBody>
      </Card>

      {/* Revenue Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            Platform Revenue
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
              <TrendingUp className="h-7 w-7 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Total Billed Revenue</p>
              <p className="text-2xl font-bold text-text-primary">
                RWF {(stats?.revenue.totalBilled ?? 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {stats?.organizations.recentLast7Days ?? 0} new organizations in the last 7 days
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default AdminDashboardPage;
