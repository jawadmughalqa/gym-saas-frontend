import { useEffect } from 'react';
import { useBackupStore } from '@/stores/backup.store';
import { downloadBackup } from '@/api/backup.api';
import { useAuthStore } from '@/stores/auth.store';

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function useAutoBackup() {
  const { enabled, frequency, lastAutoBackup, setLastAutoBackup } = useBackupStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!enabled || !user) return;

    const intervalMs = FREQUENCY_MS[frequency] ?? FREQUENCY_MS.weekly;
    const lastMs = lastAutoBackup ? new Date(lastAutoBackup).getTime() : 0;
    const elapsed = Date.now() - lastMs;

    if (elapsed < intervalMs) return;

    // Silently trigger auto-backup
    downloadBackup('auto')
      .then(() => setLastAutoBackup(new Date().toISOString()))
      .catch((err: unknown) => {
        console.warn('[Gymanger] Auto-backup failed:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on app mount
}
