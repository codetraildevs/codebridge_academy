import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@stores/auth-store';

export function ProtectedRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
