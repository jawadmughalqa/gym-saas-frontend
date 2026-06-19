import { useQueryClient } from '@tanstack/react-query';
import {
  useGetStaff,
  useGetStaffStaffId,
  usePostStaff,
  usePatchStaffStaffId,
  usePatchStaffStaffIdStatus,
  getGetStaffQueryKey,
  getGetStaffStaffIdQueryKey,
} from '@/api/generated/staff/staff';
import type {
  GetStaffParams,
  CreateStaffRequest,
  UpdateStaffRequest,
  UpdateStaffStatusRequest,
} from '@/api/generated/schemas';
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from '@/api/generated/notifications/notifications';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';

// ─── Re-export types ──────────────────────────────────────────────────────────

export type { GetStaffParams, CreateStaffRequest, UpdateStaffRequest, UpdateStaffStatusRequest };

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useStaffList(params?: GetStaffParams) {
  return useGetStaff(params, {
    query: { placeholderData: (prev) => prev, staleTime: 1000 * 30 },
  });
}

export function useStaffMember(staffId: string) {
  return useGetStaffStaffId(staffId, {
    query: { enabled: !!staffId },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateStaff(options?: { onSuccess?: (data: { email: string; tempPassword: string }) => void }) {
  const qc = useQueryClient();
  return usePostStaff({
    mutation: {
      onSuccess: (res) => {
        qc.invalidateQueries({ queryKey: getGetStaffQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        const data = (res as any)?.data;
        options?.onSuccess?.({ email: data?.email ?? '', tempPassword: data?.tempPassword ?? '' });
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to create staff account',
          description: getErrorMessage(err),
        }),
    },
  });
}

export function useUpdateStaff(staffId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return usePatchStaffStaffId({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStaffQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStaffStaffIdQueryKey(staffId) });
        toast({ title: 'Staff account updated' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to update staff account',
          description: getErrorMessage(err),
        }),
    },
  });
}

export function useUpdateStaffStatus(staffId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return usePatchStaffStaffIdStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetStaffQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStaffStaffIdQueryKey(staffId) });
        toast({ title: 'Staff status updated' });
        options?.onSuccess?.();
      },
      onError: (err) =>
        toast({
          variant: 'destructive',
          title: 'Failed to update status',
          description: getErrorMessage(err),
        }),
    },
  });
}
