import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMembers, getMember, createMember, updateMember, archiveMember,
  listSubscriptions, createSubscription, freezeSubscription, cancelSubscription,
  getMemberCheckIns, listMeasurements, logMeasurement, listMembershipPlans,
} from '@/api/members.api';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import type { ListMembersQuery, CreateMemberDto, UpdateMemberDto, CreateSubscriptionDto, FreezeSubscriptionDto, CancelSubscriptionDto, CreateMeasurementDto } from '@/types/member.types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const memberKeys = {
  all:          ['members'] as const,
  lists:        () => [...memberKeys.all, 'list'] as const,
  list:         (q: ListMembersQuery) => [...memberKeys.lists(), q] as const,
  details:      () => [...memberKeys.all, 'detail'] as const,
  detail:       (id: string) => [...memberKeys.details(), id] as const,
  subscriptions:(id: string) => [...memberKeys.detail(id), 'subscriptions'] as const,
  checkIns:     (id: string, p?: object) => [...memberKeys.detail(id), 'checkins', p] as const,
  measurements: (id: string) => [...memberKeys.detail(id), 'measurements'] as const,
  plans:        () => [...memberKeys.all, 'plans'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMembers(query: ListMembersQuery) {
  return useQuery({
    queryKey: memberKeys.list(query),
    queryFn: () => listMembers(query),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useMember(memberId: string) {
  return useQuery({
    queryKey: memberKeys.detail(memberId),
    queryFn: () => getMember(memberId),
    enabled: !!memberId,
  });
}

export function useMemberSubscriptions(memberId: string) {
  return useQuery({
    queryKey: memberKeys.subscriptions(memberId),
    queryFn: () => listSubscriptions(memberId),
    enabled: !!memberId,
  });
}

export function useMemberCheckIns(memberId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: memberKeys.checkIns(memberId, params),
    queryFn: () => getMemberCheckIns(memberId, params),
    enabled: !!memberId,
  });
}

export function useMemberMeasurements(memberId: string) {
  return useQuery({
    queryKey: memberKeys.measurements(memberId),
    queryFn: () => listMeasurements(memberId),
    enabled: !!memberId,
  });
}

export function useMembershipPlans() {
  return useQuery({
    queryKey: memberKeys.plans(),
    queryFn: listMembershipPlans,
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateMember(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMemberDto) => createMember(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
      toast({ title: 'Member registered successfully' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to register member', description: getErrorMessage(err) }),
  });
}

export function useUpdateMember(memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMemberDto) => updateMember(memberId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
      toast({ title: 'Member updated successfully' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to update member', description: getErrorMessage(err) }),
  });
}

export function useArchiveMember(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => archiveMember(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.lists() });
      toast({ title: 'Member archived' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to archive member', description: getErrorMessage(err) }),
  });
}

export function useCreateSubscription(memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubscriptionDto) => createSubscription(memberId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.subscriptions(memberId) });
      qc.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      toast({ title: 'Subscription assigned' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to assign subscription', description: getErrorMessage(err) }),
  });
}

export function useFreezeSubscription(memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, body }: { subscriptionId: string; body: FreezeSubscriptionDto }) =>
      freezeSubscription(memberId, subscriptionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.subscriptions(memberId) });
      toast({ title: 'Subscription frozen' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to freeze subscription', description: getErrorMessage(err) }),
  });
}

export function useCancelSubscription(memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, body }: { subscriptionId: string; body: CancelSubscriptionDto }) =>
      cancelSubscription(memberId, subscriptionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.subscriptions(memberId) });
      qc.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      toast({ title: 'Subscription cancelled' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to cancel subscription', description: getErrorMessage(err) }),
  });
}

export function useLogMeasurement(memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMeasurementDto) => logMeasurement(memberId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.measurements(memberId) });
      toast({ title: 'Measurement recorded' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to record measurement', description: getErrorMessage(err) }),
  });
}
