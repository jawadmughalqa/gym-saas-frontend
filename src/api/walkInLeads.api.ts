import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalkInLeadSource =
  | 'walk_in'
  | 'referral'
  | 'social_media'
  | 'website'
  | 'phone_inquiry'
  | 'event'
  | 'other';

export type WalkInLeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'trial_scheduled'
  | 'converted'
  | 'lost';

export interface WalkInLeadNote {
  _id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface WalkInLeadBranchRef {
  _id: string;
  name: string;
  code?: string;
}

export interface WalkInLeadUserRef {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface WalkInLead {
  _id: string;
  tenantId: string;
  branchId: WalkInLeadBranchRef | string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  source: WalkInLeadSource;
  interestedIn?: string;
  status: WalkInLeadStatus;
  assignedTo?: WalkInLeadUserRef | string;
  followUpDate?: string;
  visitDate: string;
  notes: WalkInLeadNote[];
  convertedMemberId?: WalkInLeadUserRef | string;
  convertedAt?: string;
  lostReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalkInLeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  convertedCount: number;
  conversionRate: number;
}

export interface ListWalkInLeadsParams {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: WalkInLeadStatus;
  source?: WalkInLeadSource;
  assignedTo?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  followUpFrom?: string;
  followUpTo?: string;
  sortBy?: 'visitDate' | 'followUpDate' | 'createdAt' | 'fullName';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedWalkInLeadsResponse {
  success: boolean;
  data: WalkInLead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
    totalPages?: number;
  };
}

export interface CreateWalkInLeadPayload {
  branchId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  source?: WalkInLeadSource;
  interestedIn?: string;
  status?: 'new' | 'contacted' | 'follow_up' | 'trial_scheduled';
  assignedTo?: string;
  followUpDate?: string;
  visitDate?: string;
  note?: string;
}

export interface UpdateWalkInLeadPayload {
  branchId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  source?: WalkInLeadSource;
  interestedIn?: string;
  status?: 'new' | 'contacted' | 'follow_up' | 'trial_scheduled' | 'lost';
  assignedTo?: string;
  followUpDate?: string;
  visitDate?: string;
  lostReason?: string;
}

export interface ConvertWalkInLeadPayload {
  branchId?: string;
  email?: string;
  age?: number;
  govId?: string;
  govIdType?: 'cnic' | 'passport' | 'driving_license' | 'other';
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  healthQuestionnaire?: {
    hasCardiacCondition: boolean;
    hasChronicIllness: boolean;
    hasPhysicalLimitations: boolean;
    notes?: string;
  };
  consentMarketing?: boolean;
  consentDataProcessing?: boolean;
  waiverAccepted?: boolean;
  waiverDocumentVersion?: string;
  notes?: string;
}

export interface ConvertWalkInLeadResult {
  lead: WalkInLead;
  member: Record<string, unknown>;
  loginEmail: string;
  tempPassword: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listWalkInLeads(
  params?: ListWalkInLeadsParams,
): Promise<PaginatedWalkInLeadsResponse> {
  const { data } = await api.get<PaginatedWalkInLeadsResponse>('/walkin-leads', { params });
  return data;
}

export async function getWalkInLeadStats(branchId?: string): Promise<WalkInLeadStats> {
  const { data } = await api.get<ApiResponse<WalkInLeadStats>>('/walkin-leads/stats', {
    params: branchId ? { branchId } : undefined,
  });
  return data.data!;
}

export async function getWalkInLead(id: string): Promise<WalkInLead> {
  const { data } = await api.get<ApiResponse<WalkInLead>>(`/walkin-leads/${id}`);
  return data.data!;
}

export async function createWalkInLead(payload: CreateWalkInLeadPayload): Promise<WalkInLead> {
  const { data } = await api.post<ApiResponse<WalkInLead>>('/walkin-leads', payload);
  return data.data!;
}

export async function updateWalkInLead(
  id: string,
  payload: UpdateWalkInLeadPayload,
): Promise<WalkInLead> {
  const { data } = await api.patch<ApiResponse<WalkInLead>>(`/walkin-leads/${id}`, payload);
  return data.data!;
}

export async function deleteWalkInLead(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/walkin-leads/${id}`);
}

export async function addWalkInLeadNote(id: string, text: string): Promise<WalkInLead> {
  const { data } = await api.post<ApiResponse<WalkInLead>>(`/walkin-leads/${id}/notes`, { text });
  return data.data!;
}

export async function convertWalkInLead(
  id: string,
  payload?: ConvertWalkInLeadPayload,
): Promise<ConvertWalkInLeadResult> {
  const { data } = await api.post<ApiResponse<ConvertWalkInLeadResult>>(
    `/walkin-leads/${id}/convert`,
    payload ?? {},
  );
  return data.data!;
}
