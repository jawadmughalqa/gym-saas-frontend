import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

// Singleton queryClient reference for use inside the axios interceptor.
// The actual QueryClient is created in main.tsx — we expose a setter so the
// interceptor can call qc.clear() on forced logout without a circular dep.
let _queryClient: QueryClient | null = null;
export function setAxiosQueryClient(qc: QueryClient) {
  _queryClient = qc;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach in-memory access token ──────────────────────

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — silent 401 refresh with queue lock ───────────────
//
// Problem this solves: when multiple API calls are in-flight simultaneously and
// the access token expires, every one of them gets a 401 and each would
// independently call POST /auth/refresh. The backend rotates the refresh token
// on the first call; the second call presents the old (now-rotated) token and
// either causes a version conflict error or triggers the reuse-detection path
// that revokes ALL sessions, logging the user out.
//
// Solution: a module-level lock + queue. Only the first 401 starts a refresh.
// All subsequent 401s wait on the same promise. When the refresh resolves,
// every queued request gets the new token injected and retries. If the refresh
// fails, all queued requests are rejected and the user is sent to /login.

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const drainQueue = (token: string | null) => {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't already been retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't intercept the refresh call itself — that would cause an infinite loop
    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      // Refresh now returns { accessToken, user } — same shape as login.
      // Always call setAuth (not just setAccessToken) so user/role stays current.
      const newToken: string = data.data.accessToken;
      if (data.data.user) {
        useAuthStore.getState().setAuth(data.data.user, newToken);
      } else {
        useAuthStore.getState().setAccessToken(newToken);
      }

      isRefreshing = false;
      drainQueue(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (_refreshError) {
      isRefreshing = false;
      drainQueue(null); // Reject all queued requests
      useAuthStore.getState().clearAuth();
      // Wipe cached query data so the next user never sees stale data
      _queryClient?.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }
  },
);

export default api;