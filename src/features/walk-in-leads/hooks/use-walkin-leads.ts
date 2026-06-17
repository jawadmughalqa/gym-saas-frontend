import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWalkInLeads,
  getWalkInLead,
  getWalkInLeadStats,
  createWalkInLead,
  updateWalkInLead,
  deleteWalkInLead,
  addWalkInLeadNote,
  convertWalkInLead,
  type ListWalkInLeadsParams,
  type CreateWalkInLeadPayload,
  type UpdateWalkInLeadPayload,
  type ConvertWalkInLeadPayload,
} from '@/api/walkInLeads.api';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';

// ─── Query keys ───────────────────────────────────────────────────────────────

const KEY = 'walkin-leads';

export const walkInLeadsKeys = {
  all: [KEY] as const,
  list: (params?: ListWalkInLeadsParams) => [KEY, 'list', params] as const,
  detail: (id: string) => [KEY, 'detail', id] as const,
  stats: (branchId?: string) => [KEY, 'stats', branchId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useWalkInLeads(params?: ListWalkInLeadsParams) {
  return useQuery({
    queryKey: walkInLeadsKeys.list(params),
    queryFn: () => listWalkInLeads(params),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useWalkInLead(id: string) {
  return useQuery({
    queryKey: walkInLeadsKeys.detail(id),
    queryFn: () => getWalkInLead(id),
    enabled: !!id,
  });
}

export function useWalkInLeadStats(branchId?: string) {
  return useQuery({
    queryKey: walkInLeadsKeys.stats(branchId),
    queryFn: () => getWalkInLeadStats(branchId),
    staleTime: 1000 * 60,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateWalkInLead(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWalkInLeadPayload) => createWalkInLead(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.all });
      toast({ title: 'Lead added' });
      options?.onSuccess?.();
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to add lead',
        description: getErrorMessage(err),
      }),
  });
}

export function useUpdateWalkInLead(id: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWalkInLeadPayload) => updateWalkInLead(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.all });
      toast({ title: 'Lead updated' });
      options?.onSuccess?.();
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to update lead',
        description: getErrorMessage(err),
      }),
  });
}

export function useDeleteWalkInLead(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWalkInLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.all });
      toast({ title: 'Lead deleted' });
      options?.onSuccess?.();
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to delete lead',
        description: getErrorMessage(err),
      }),
  });
}

export function useAddWalkInLeadNote(id: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addWalkInLeadNote(id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.list() });
      toast({ title: 'Note added' });
      options?.onSuccess?.();
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to add note',
        description: getErrorMessage(err),
      }),
  });
}

export function useConvertWalkInLead(id: string, options?: { onSuccess?: (result: Awaited<ReturnType<typeof convertWalkInLead>>) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: ConvertWalkInLeadPayload) => convertWalkInLead(id, payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: walkInLeadsKeys.all });
      toast({ title: 'Lead converted to member' });
      options?.onSuccess?.(result);
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Failed to convert lead',
        description: getErrorMessage(err),
      }),
  });
}
