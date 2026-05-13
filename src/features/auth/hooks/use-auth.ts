import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginApi, logoutApi, changePasswordApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Routes that are role-gated. Never bounce a newly-logged-in user back to
 * these paths if they landed on /login from there (e.g. superadmin tab left open,
 * then gym owner signs in → would hit /super-admin's allowedRoles guard → 403).
 */
const ROLE_GATED_PREFIXES = ['/super-admin', '/unauthorized'];

function getSafeRedirect(from: string): string {
  const isGated = ROLE_GATED_PREFIXES.some((prefix) => from.startsWith(prefix));
  return isGated ? '/dashboard' : from;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to the page the user was trying to reach, or /dashboard
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);

      // First-time login: must change password before accessing the app
      if (data.user.forcePasswordChange) {
        navigate('/settings/change-password', { replace: true });
        return;
      }

      // Sanitize redirect — prevent sending a gym_owner to /super-admin, etc.
      navigate(getSafeRedirect(from), { replace: true });
    },
    onError: (error) => {
      // Error is surfaced inline on the login form — toast is redundant here,
      // but we keep it as a fallback for network-level failures.
      const msg = getErrorMessage(error);
      if (msg.toLowerCase().includes('network')) {
        toast({ variant: 'destructive', title: 'Network error', description: msg });
      }
    },
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      clearAuth();
      qc.clear(); // wipe all cached query data
      navigate('/login', { replace: true });
    },
  });
}

// ─── Change password ──────────────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to update password', description: getErrorMessage(error) });
    },
  });
}
