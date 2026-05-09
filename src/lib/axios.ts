import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true, // send httpOnly refresh-token cookie
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

// ─── Response interceptor — silent 401 refresh ────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
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

        const newToken: string = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);

        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (_refreshError) {
        useAuthStore.getState().clearAuth();
        refreshQueue = [];
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
