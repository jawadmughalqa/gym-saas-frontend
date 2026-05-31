import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadFormType = 'demo_request' | 'contact' | 'newsletter';
export type LeadStatus   = 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';

export interface LeadNote {
  _id:        string;
  text:       string;
  authorId:   string;
  authorName: string;
  createdAt:  string;
}

export interface LeadAssignee {
  _id:       string;
  firstName: string;
  lastName:  string;
  email:     string;
}

export interface Lead {
  _id:           string;
  formType:      LeadFormType;
  name?:         string;
  email?:        string;
  phone?:        string;
  facilityName?: string;
  facilityType?: string;
  contactMethod?: 'whatsapp' | 'call' | 'email';
  message?:      string;
  status:        LeadStatus;
  assignedTo?:   LeadAssignee | null;
  notes:         LeadNote[];
  metadata: {
    sourcePage?:  string;
    referrer?:    string;
    submittedAt:  string;
    userAgent?:   string;
    deviceType?:  'mobile' | 'tablet' | 'desktop';
    utmSource?:   string;
    utmMedium?:   string;
    utmCampaign?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total:          number;
  recent:         number;
  statusCounts:   Record<LeadStatus, number>;
  formTypeCounts: Record<LeadFormType, number>;
}

export interface ListLeadsParams {
  page?:       number;
  limit?:      number;
  search?:     string;
  status?:     LeadStatus;
  formType?:   LeadFormType;
  assignedTo?: string;
  sortBy?:     'createdAt' | 'updatedAt' | 'status';
  sortOrder?:  'asc' | 'desc';
}

export interface PaginatedLeadsResponse {
  success: boolean;
  data:    Lead[];
  pagination: {
    page:  number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function listLeads(params?: ListLeadsParams): Promise<PaginatedLeadsResponse> {
  const { data } = await api.get<PaginatedLeadsResponse>('/leads', { params });
  return data;
}

export async function getLeadStats(): Promise<LeadStats> {
  const { data } = await api.get<ApiResponse<LeadStats>>('/leads/stats');
  return data.data!;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
  return data.data!;
}

export async function updateLead(
  id: string,
  payload: { status?: LeadStatus; assignedTo?: string | null },
): Promise<Lead> {
  const { data } = await api.patch<ApiResponse<Lead>>(`/leads/${id}`, payload);
  return data.data!;
}

export async function addLeadNote(id: string, text: string): Promise<Lead> {
  const { data } = await api.post<ApiResponse<Lead>>(`/leads/${id}/notes`, { text });
  return data.data!;
}

export async function getLeadAssignees(): Promise<LeadAssignee[]> {
  const { data } = await api.get<ApiResponse<LeadAssignee[]>>('/leads/assignees');
  return data.data ?? [];
}

export function getLeadsExportUrl(params?: Omit<ListLeadsParams, 'page' | 'limit'>): string {
  const base = (import.meta.env.VITE_API_URL ?? '/api/v1') + '/leads/export';
  const qs   = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `${base}?${qs}` : base;
}
