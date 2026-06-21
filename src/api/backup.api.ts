import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupLog {
  _id: string;
  tenantId: string;
  triggeredBy: { _id: string; name: string } | null;
  triggerType: 'manual' | 'auto';
  sizeBytes: number;
  collectionsCount: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function downloadBackup(trigger: 'manual' | 'auto' = 'manual'): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const baseURL = (api.defaults.baseURL ?? '/api/v1').replace(/\/$/, '');

  const response = await fetch(`${baseURL}/backup/export?trigger=${trigger}`, {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error((json as { message?: string }).message ?? 'Backup export failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymanger-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ imported: Record<string, number> }> {
  const formData = new FormData();
  formData.append('backup', file);

  const { data } = await api.post<ApiResponse<{ imported: Record<string, number> }>>(
    '/backup/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function getBackupLogs(): Promise<BackupLog[]> {
  const { data } = await api.get<ApiResponse<BackupLog[]>>('/backup/logs');
  return data.data;
}
