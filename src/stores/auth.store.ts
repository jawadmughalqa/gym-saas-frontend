import { create } from 'zustand';
import type { UserRole } from '@/types/api.types';

interface AuthUser {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isInitialised: boolean;

  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setInitialised: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialised: false,

  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setInitialised: () => set({ isInitialised: true }),
}));

// Selector helpers — stable references
export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => !!s.accessToken;
export const selectRole = (s: AuthState) => s.user?.role ?? null;
export const selectTenantId = (s: AuthState) => s.user?.tenantId ?? null;
