import { create } from 'zustand';
import type { UserRole } from '@/types/api.types';
import type { Permission } from '@/lib/permissions';

interface AuthUser {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
  name: string;
  branchIds?: string[];
  permissions: Permission[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isInitialised: boolean;

  // ─── Impersonation ─────────────────────────────────────────────────────────
  /** True when super-admin is acting as a gym owner */
  isImpersonating: boolean;
  /** The super-admin's original token — stored so we can restore it on exit */
  originalToken: string | null;
  /** The super-admin's original user object */
  originalUser: AuthUser | null;

  // ─── Actions ───────────────────────────────────────────────────────────────
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setInitialised: () => void;

  /**
   * Switch the active session to the impersonation token.
   * Saves the current (super-admin) token so it can be restored later.
   */
  enterImpersonation: (impersonationToken: string, impersonatedUser: AuthUser) => void;

  /**
   * Restore the original super-admin session and clear impersonation state.
   */
  exitImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isInitialised: false,
  isImpersonating: false,
  originalToken: null,
  originalUser: null,

  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({
    user: null,
    accessToken: null,
    isImpersonating: false,
    originalToken: null,
    originalUser: null,
  }),
  setInitialised: () => set({ isInitialised: true }),

  enterImpersonation: (impersonationToken, impersonatedUser) => {
    const { accessToken, user } = get();
    set({
      originalToken: accessToken,
      originalUser: user,
      accessToken: impersonationToken,
      user: impersonatedUser,
      isImpersonating: true,
    });
  },

  exitImpersonation: () => {
    const { originalToken, originalUser } = get();
    set({
      accessToken: originalToken,
      user: originalUser,
      isImpersonating: false,
      originalToken: null,
      originalUser: null,
    });
  },
}));

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => !!s.accessToken;
export const selectRole = (s: AuthState) => s.user?.role ?? null;
export const selectTenantId = (s: AuthState) => s.user?.tenantId ?? null;
export const selectPermissions = (s: AuthState) => s.user?.permissions ?? [];
export const selectIsImpersonating = (s: AuthState) => s.isImpersonating;
