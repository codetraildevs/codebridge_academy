import { AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useAuthStore } from '@stores/auth-store';
import { useDashboardQuery } from '@hooks/use-dashboard';
import { PlatformOwnerDashboard } from './components/platform-owner-dashboard';
import { OrgDashboard } from './components/org-dashboard';
import { RoleDashboard } from './components/role-dashboard';
import { DashboardSkeleton } from './components/skeleton';
import { RefetchIndicator } from './components/refetch-indicator';

// ═══════════════════════════════════════════════════
//  MAIN — role-adaptive entry point
// ═══════════════════════════════════════════════════

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  // ── React Query hook — handles caching, refetch intervals, errors ──
  const {
    overview,
    orgData,
    roleData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDashboardQuery();

  // ── Loading state (initial load) ─────────────
  if (isLoading) return <DashboardSkeleton role={role} />;

  // ── Error state ──────────────────────────────
  if (error && !overview && !orgData && !roleData) {
    const errorMessage = (error as any)?.response?.data?.message
      || (error as any)?.message
      || 'Failed to load dashboard';

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-12 w-12 text-error mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Failed to load dashboard</h2>
        <p className="text-sm text-text-secondary mb-6">{errorMessage}</p>
        <Button onClick={() => refetch()} variant="primary" icon={<RefreshCw className="h-4 w-4" />}>
          Retry
        </Button>
      </div>
    );
  }

  // ── Role-based rendering ──────────────────────
  if (role === 'PLATFORM_OWNER' && overview) {
    return (
      <>
        <div className="flex items-center justify-end gap-3 mb-2">
          <RefetchIndicator isFetching={isFetching} />
        </div>
        <PlatformOwnerDashboard overview={overview} user={user} />
      </>
    );
  }

  if ((role === 'ORGANIZATION_OWNER' || role === 'ADMIN') && orgData) {
    return (
      <>
        <div className="flex items-center justify-end gap-3 mb-2">
          <RefetchIndicator isFetching={isFetching} />
        </div>
        <OrgDashboard data={orgData} />
      </>
    );
  }

  if (roleData) {
    return <RoleDashboard data={roleData} />;
  }

  // Fallback — should not normally reach here
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Activity className="h-12 w-12 text-text-tertiary mb-4" />
      <h2 className="text-xl font-semibold text-text-primary mb-2">Dashboard</h2>
      <p className="text-sm text-text-secondary">Welcome to Qualexas. Select a module from the sidebar to get started.</p>
    </div>
  );
}

export default DashboardPage;
