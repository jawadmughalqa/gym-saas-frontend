import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/stores/auth.store';
import { hasPermission, type Permission } from '@/lib/permissions';
import type { UserRole } from '@/types/api.types';

interface ProtectedRouteProps {
  /** Only these roles may access this route */
  allowedRoles?: UserRole[];
  /** User must have this permission to access this route */
  requiredPermission?: Permission;
}

/**
 * Wraps a group of routes.
 * - Redirects to /login if unauthenticated (preserves intended location for post-login redirect)
 * - Redirects to /unauthorized if role or permission check fails
 */
export default function ProtectedRoute({ allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && role && !hasPermission(role, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
