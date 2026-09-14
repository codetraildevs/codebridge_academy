import { useQuery } from '@tanstack/react-query';
import { roleService, type Role } from '@services/role-service';

export const roleKeys = {
  all: ['roles'] as const,
};

/**
 * Hook to fetch all roles from the API.
 * Roles are cached for 30 minutes since they rarely change.
 */
export function useRoles() {
  return useQuery<Role[]>({
    queryKey: roleKeys.all,
    queryFn: () => roleService.list(),
    staleTime: 30 * 60 * 1000, // 30 min — roles rarely change
    retry: 2,
  });
}

/**
 * Get a human-readable display label for a role name.
 */
export function getRoleDisplayName(roleName: string, roles?: Role[]): string {
  if (roles) {
    const found = roles.find((r) => r.name === roleName);
    if (found?.description) return found.description.split(' — ')[0] ?? found.name;
  }
  // Fallback: convert SNAKE_CASE to Title Case
  return roleName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get a color class for a role's avatar/badge based on the role index.
 * Uses a fixed palette so colors are deterministic for known roles.
 */
export function getRoleAvatarColor(roleName: string, roles?: Role[]): string {
  if (roles) {
    const idx = roles.findIndex((r) => r.name === roleName);
    if (idx >= 0) {
      const palette = [
        'bg-amber-100 text-amber-700',   // 0: PLATFORM_OWNER
        'bg-primary-100 text-primary-700', // 1: ORGANIZATION_OWNER
        'bg-secondary-100 text-secondary-700',
        'bg-accent-100 text-accent-700',
        'bg-purple-100 text-purple-700',
        'bg-cyan-100 text-cyan-700',
        'bg-blue-100 text-blue-700',
        'bg-emerald-100 text-emerald-700',
      ];
      return palette[idx % palette.length] ?? 'bg-primary-100 text-primary-700';
    }
  }
  return 'bg-primary-100 text-primary-700';
}

export default useRoles;
