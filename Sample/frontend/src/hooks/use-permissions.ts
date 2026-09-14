import { useQuery } from '@tanstack/react-query';
import { permissionService } from '@services/permission-service';
import { useAuthStore } from '@stores/auth-store';
import type { Permission, PermissionName } from '../types/permissions';

export const permissionKeys = {
  myPermissions: ['auth', 'permissions'] as const,
};

/**
 * Hook to fetch the current user's permissions.
 * Permissions are cached for 30 minutes since they rarely change.
 */
export function usePermissions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<Permission[]>({
    queryKey: permissionKeys.myPermissions,
    queryFn: () => permissionService.getMyPermissions(),
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });
}

/**
 * Check whether the current user has a specific permission.
 * Returns true/false based on the cached permissions data.
 */
export function useHasPermission(permissionName: PermissionName): boolean {
  const { data: permissions } = usePermissions();
  if (!permissions) return false;
  return permissions.some((p) => p.name === permissionName);
}

/**
 * Check whether the current user has ALL of the specified permissions.
 */
export function useHasAllPermissions(...permissionNames: PermissionName[]): boolean {
  const { data: permissions } = usePermissions();
  if (!permissions) return false;
  if (permissionNames.length === 0) return true;
  return permissionNames.every((name) => permissions.some((p) => p.name === name));
}

/**
 * Check whether the current user has ANY of the specified permissions.
 */
export function useHasAnyPermission(...permissionNames: PermissionName[]): boolean {
  const { data: permissions } = usePermissions();
  if (!permissions) return false;
  if (permissionNames.length === 0) return true;
  return permissionNames.some((name) => permissions.some((p) => p.name === name));
}

/**
 * Check whether the current user has a specific permission (non-hook version).
 * Useful in contexts where hooks can't be used (e.g., event handlers).
 */
export function can(
  permissions: Permission[] | undefined,
  permissionName: PermissionName,
): boolean {
  if (!permissions) return false;
  return permissions.some((p) => p.name === permissionName);
}

export default usePermissions;
