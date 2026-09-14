import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@hooks/use-permissions';
import { useAuthStore } from '@stores/auth-store';
import type { PermissionName } from '../../types/permissions';

interface RequirePermissionProps {
  /** One or more permissions required to access the content */
  permissions: PermissionName | PermissionName[];
  /** How to evaluate multiple permissions */
  mode?: 'all' | 'any';
  /** What to render when the user lacks permissions */
  fallback?: ReactNode;
  /** If true, redirect to dashboard instead of rendering fallback */
  redirect?: boolean;
  children: ReactNode;
}

/**
 * Component-level permission gate.
 * Use this to conditionally render UI elements based on user permissions.
 *
 * Examples:
 *   <RequirePermission permissions="exams:create">
 *     <CreateExamButton />
 *   </RequirePermission>
 *
 *   <RequirePermission permissions={['users:view', 'users:manage']} mode="any">
 *     <UsersLink />
 *   </RequirePermission>
 */
export function RequirePermission({
  permissions,
  mode = 'all',
  fallback = null,
  redirect = false,
  children,
}: RequirePermissionProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: userPermissions, isLoading, isError } = usePermissions();

  // Not authenticated — can't check permissions
  if (!isAuthenticated) {
    if (redirect) return <Navigate to="/auth/login" replace />;
    return null;
  }

  // Still loading permissions — lightweight placeholder instead of a blank page.
  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Checking permissions"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary-500" />
      </div>
    );
  }

  // The permission lookup itself failed. Fail OPEN: the backend remains the
  // authoritative security layer, so a legitimate user is never blocked by a
  // stale/failed permission fetch. (The sidebar already degrades to its role
  // gate in the same situation.) A successful-but-empty permission list still
  // denies as expected.
  if (isError || !userPermissions) {
    return <>{children}</>;
  }

  const permList = Array.isArray(permissions) ? permissions : [permissions];

  const hasAccess =
    mode === 'all'
      ? permList.every((p) => userPermissions.some((up) => up.name === p))
      : permList.some((p) => userPermissions.some((up) => up.name === p));

  if (!hasAccess) {
    if (redirect) return <Navigate to="/dashboard" replace />;
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Route-level permission guard.
 * Use this in route definitions to protect entire pages.
 * Renders Outlet if authorized, otherwise redirects to dashboard.
 */
export function PermissionGuard({ permissions, mode = 'all', children }: { permissions: PermissionName | PermissionName[]; mode?: 'all' | 'any'; children?: React.ReactNode }) {
  return (
    <RequirePermission permissions={permissions} mode={mode} redirect>
      {children}
    </RequirePermission>
  );
}

export default RequirePermission;
