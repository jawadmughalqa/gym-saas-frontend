import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Redirects the root path ("/") to the correct landing page
 * based on the logged-in user's role.
 */
export default function RootRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  const dest =
    role === 'super_admin' ? '/super-admin'       :
    role === 'member'      ? '/member/home'       :
    role === 'trainer'     ? '/trainer/dashboard' :
    '/dashboard';
  return <Navigate to={dest} replace />;
}
