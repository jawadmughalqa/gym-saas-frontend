import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { loginApi, logoutApi, changePasswordApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import type { UserRole } from '@/types/api.types';

// ─── Role → default landing page ─────────────────────────────────────────────

/**
 * Each role has a fixed default landing page after login.
 * This prevents a gym_owner's last-visited URL (/dashboard) from being shown
 * to a member who logs in next on the same browser.
 */
function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'super_admin':    return '/super-admin';
    case 'gym_owner':      return '/dashboard';
    case 'branch_manager': return '/dashboard';
    case 'trainer':        return '/dashboard';
    case 'staff':          return '/dashboard';
    case 'member':         return '/member/home';
    default:               return '/dashboard';
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      // Clear any cached data from a previous user's session before setting
      // the new user so queries never see stale cross-user data
      qc.clear();

      setAuth(data.user, data.accessToken);

      // First-time login: must change password before accessing the app
      if (data.user.forcePasswordChange) {
        navigate('/settings/change-password', { replace: true });
        return;
      }

      // Always go to the role's fixed default page — never reuse a URL that
      // belonged to a previous user's session
      navigate(getDefaultRouteForRole(data.user.role as UserRole), { replace: true });
    },
    onError: (error) => {
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
