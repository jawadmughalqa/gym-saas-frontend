import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type {
  Member,
  MemberListResponse,
  MembershipPlan,
  Subscription,
  CheckInListResponse,
  Measurement,
  ListMembersQuery,
  CreateMemberDto,
  UpdateMemberDto,
  CreateSubscriptionDto,
  FreezeSubscriptionDto,
  CancelSubscriptionDto,
  CreateMeasurementDto,
} from '@/types/member.types';

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(query: ListMembersQuery) {
  const { data } = await api.get<ApiResponse<MemberListResponse>>('/members', { params: query });
  return data.data;
}

export async function getMember(memberId: string) {
  const { data } = await api.get<ApiResponse<{ member: Member; activeSubscription?: Subscription }>>(`/members/${memberId}`);
  return data.data;
}

export async function createMember(body: CreateMemberDto) {
  const { data } = await api.post<ApiResponse<Member>>('/members', body);
  return data.data;
}

export async function updateMember(memberId: string, body: UpdateMemberDto) {
  const { data } = await api.patch<ApiResponse<Member>>(`/members/${memberId}`, body);
  return data.data;
}

export async function archiveMember(memberId: string) {
  const { data } = await api.delete<ApiResponse<{ message: string }>>(`/members/${memberId}`);
  return data.data;
}

export async function getMemberTimeline(memberId: string) {
  const { data } = await api.get<ApiResponse<unknown>>(`/members/${memberId}/timeline`);
  return data.data;
}

// ─── Membership Plans ─────────────────────────────────────────────────────────

export async function listMembershipPlans() {
  const { data } = await api.get<ApiResponse<{ plans: MembershipPlan[] }>>('/members/plans');
  return data.data.plans;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function listSubscriptions(memberId: string) {
  const { data } = await api.get<ApiResponse<{ subscriptions: Subscription[] }>>(`/members/${memberId}/subscriptions`);
  return data.data.subscriptions;
}

export async function createSubscription(memberId: string, body: CreateSubscriptionDto) {
  const { data } = await api.post<ApiResponse<Subscription>>(`/members/${memberId}/subscriptions`, body);
  return data.data;
}

export async function freezeSubscription(memberId: string, subscriptionId: string, body: FreezeSubscriptionDto) {
  const { data } = await api.post<ApiResponse<Subscription>>(
    `/members/${memberId}/subscriptions/${subscriptionId}/freeze`,
    body,
  );
  return data.data;
}

export async function resumeSubscription(memberId: string, subscriptionId: string) {
  const { data } = await api.post<ApiResponse<Subscription>>(
    `/members/${memberId}/subscriptions/${subscriptionId}/resume`,
  );
  return data.data;
}

export async function cancelSubscription(memberId: string, subscriptionId: string, body: CancelSubscriptionDto) {
  const { data } = await api.post<ApiResponse<Subscription>>(
    `/members/${memberId}/subscriptions/${subscriptionId}/cancel`,
    body,
  );
  return data.data;
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

export async function getMemberCheckIns(memberId: string, params?: { page?: number; limit?: number }) {
  const { data } = await api.get<ApiResponse<CheckInListResponse>>(
    `/members/${memberId}/checkins`,
    { params },
  );
  return data.data;
}

// ─── Measurements ─────────────────────────────────────────────────────────────

export async function listMeasurements(memberId: string) {
  const { data } = await api.get<ApiResponse<{ measurements: Measurement[] }>>(
    `/members/${memberId}/measurements`,
  );
  return data.data.measurements;
}

export async function logMeasurement(memberId: string, body: CreateMeasurementDto) {
  const { data } = await api.post<ApiResponse<Measurement>>(
    `/members/${memberId}/measurements`,
    body,
  );
  return data.data;
}
