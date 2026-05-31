import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listLeads,
  getLead,
  getLeadStats,
  updateLead,
  addLeadNote,
  getLeadAssignees,
  type ListLeadsParams,
} from '@/api/leads.api';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const leadsKeys = {
  all:       ['leads'] as const,
  list:      (params?: ListLeadsParams) => ['leads', 'list', params] as const,
  detail:    (id: string) => ['leads', 'detail', id] as const,
  stats:     () => ['leads', 'stats'] as const,
  assignees: () => ['leads', 'assignees'] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────

export function useLeads(params?: ListLeadsParams) {
  return useQuery({
    queryKey: leadsKeys.list(params),
    queryFn:  () => listLeads(params),
    staleTime: 30_000,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useLeadStats() {
  return useQuery({
    queryKey: leadsKeys.stats(),
    queryFn:  getLeadStats,
    staleTime: 30_000,
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useLead(id: string | null) {
  return useQuery({
    queryKey: leadsKeys.detail(id ?? ''),
    queryFn:  () => getLead(id!),
    enabled:  !!id,
    staleTime: 10_000,
  });
}

// ─── Assignees list ───────────────────────────────────────────────────────────

export function useLeadAssignees() {
  return useQuery({
    queryKey: leadsKeys.assignees(),
    queryFn:  getLeadAssignees,
    staleTime: 5 * 60_000,
  });
}

// ─── Update status / assignee ─────────────────────────────────────────────────

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: string; assignedTo?: string | null }) =>
      updateLead(id, payload as Parameters<typeof updateLead>[1]),
    onSuccess: (updated) => {
      qc.setQueryData(leadsKeys.detail(updated._id), updated);
      void qc.invalidateQueries({ queryKey: leadsKeys.list() });
      void qc.invalidateQueries({ queryKey: leadsKeys.stats() });
    },
  });
}

// ─── Add note ─────────────────────────────────────────────────────────────────

export function useAddLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => addLeadNote(id, text),
    onSuccess: (updated) => {
      qc.setQueryData(leadsKeys.detail(updated._id), updated);
    },
  });
}
