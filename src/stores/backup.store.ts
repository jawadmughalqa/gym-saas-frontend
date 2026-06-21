import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

interface BackupState {
  enabled: boolean;
  frequency: BackupFrequency;
  lastAutoBackup: string | null;

  setEnabled: (enabled: boolean) => void;
  setFrequency: (frequency: BackupFrequency) => void;
  setLastAutoBackup: (timestamp: string) => void;
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      enabled: false,
      frequency: 'weekly',
      lastAutoBackup: null,

      setEnabled: (enabled) => set({ enabled }),
      setFrequency: (frequency) => set({ frequency }),
      setLastAutoBackup: (timestamp) => set({ lastAutoBackup: timestamp }),
    }),
    { name: 'gymanger-backup-settings' },
  ),
);
