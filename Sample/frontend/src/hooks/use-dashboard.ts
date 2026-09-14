import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@stores/auth-store';
import { dashboardService } from '@services/dashboard-service';
import type { PlatformOverview, OrgDashboardData, RoleDashboardData } from '@services/dashboard-service';

// ── Query key factories (enables targeted invalidation) ──

export const dashboardKeys = {
  all: ['dashboard'] as const,
  platform: () => [...dashboardKeys.all, 'platform'] as const,
  organization: (orgId: string) => [...dashboardKeys.all, 'organization', orgId] as const,
  role: (role: string) => [...dashboardKeys.all, 'role', role] as const,
};

// ── Stale time: how long data is considered fresh ──

function getStaleTime(role: string): number {
  switch (role) {
    case 'PLATFORM_OWNER':
    case 'ORGANIZATION_OWNER':
    case 'ADMIN':
      return 15_000; // 15s — accept slightly stale data to reduce renders
    default:
      return 5 * 60_000; // 5 min — role data rarely changes
  }
}

// ── Hook: Platform Owner dashboard ──────────────

export function usePlatformDashboard() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  return useQuery<PlatformOverview>({
    queryKey: dashboardKeys.platform(),
    queryFn: () => dashboardService.getPlatformOverview(),
    enabled: role === 'PLATFORM_OWNER',
    refetchInterval: 30_000, // 30s polling for real-time platform monitoring
    staleTime: getStaleTime(role),
    retry: 2,
  });
}

// ── Hook: Organization Owner / Admin dashboard ──

/**
 * Hook: Organization Owner / Admin dashboard.
 * Throws a user-friendly error if the user has an org role but no linked org.
 */
export function useOrganizationDashboard() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const orgId = user?.organizationId;
  const isOrgRole = role === 'ORGANIZATION_OWNER' || role === 'ADMIN';

  return useQuery<OrgDashboardData>({
    queryKey: dashboardKeys.organization(orgId ?? 'none'),
    queryFn: async () => {
      if (!orgId) {
        throw new Error('No organization linked to your account');
      }
      return dashboardService.getOrganizationDashboard(orgId);
    },
    enabled: isOrgRole,
    refetchInterval: 60_000, // 60s polling for org metrics
    staleTime: getStaleTime(role),
    retry: 2,
  });
}

// ── Hook: Other roles (DESIGNER, ASSESSOR, REVIEWER, CANDIDATE, INDIVIDUAL) ──

export function useRoleDashboard() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const isPlatformOrOrg = role === 'PLATFORM_OWNER' || role === 'ORGANIZATION_OWNER' || role === 'ADMIN';

  return useQuery<RoleDashboardData>({
    queryKey: dashboardKeys.role(role),
    queryFn: () => dashboardService.getRoleDashboard(role),
    enabled: !isPlatformOrOrg && !!role,
    staleTime: getStaleTime(role),
    retry: 1,
  });
}

// ── Combined hook: single entry point for the dashboard page ──

interface DashboardQueryResult {
  overview: PlatformOverview | undefined;
  orgData: OrgDashboardData | undefined;
  roleData: RoleDashboardData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboardQuery(): DashboardQueryResult {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  const platformQuery = usePlatformDashboard();
  const orgQuery = useOrganizationDashboard();
  const roleQuery = useRoleDashboard();

  const isPlatformOrOrg = role === 'PLATFORM_OWNER' || role === 'ORGANIZATION_OWNER' || role === 'ADMIN';

  return {
    overview: platformQuery.data,
    orgData: orgQuery.data,
    roleData: roleQuery.data,
    isLoading: isPlatformOrOrg
      ? platformQuery.isLoading || orgQuery.isLoading
      : roleQuery.isLoading,
    isFetching: isPlatformOrOrg
      ? platformQuery.isFetching || orgQuery.isFetching
      : roleQuery.isFetching,
    error: isPlatformOrOrg
      ? (platformQuery.error ?? orgQuery.error)
      : roleQuery.error,
    refetch: () => {
      platformQuery.refetch();
      orgQuery.refetch();
      roleQuery.refetch();
    },
  };
}

export default useDashboardQuery;
