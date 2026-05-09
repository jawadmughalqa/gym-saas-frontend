import api from '@/lib/axios';
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types/api.types';

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function loginApi(body: LoginRequest) {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', body);
  return data.data;
}

// ─── Logout ────────────────────────────────────────────────────────────────────

export async function logoutApi() {
  await api.post('/auth/logout');
}

// ─── Silent refresh (used by AuthProvider + axios interceptor) ─────────────────

export async function refreshTokenApi() {
  const { data } = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
  return data.data;
}

// ─── Current user profile ──────────────────────────────────────────────────────

export async function getMeApi() {
  const { data } = await api.get<ApiResponse<LoginResponse['user']>>('/auth/me');
  return data.data;
}

// ─── Change password ───────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export async function changePasswordApi(body: ChangePasswordRequest) {
  await api.patch('/auth/change-password', body);
}
