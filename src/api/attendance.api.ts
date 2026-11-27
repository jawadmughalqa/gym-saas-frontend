import { useQuery } from '@tanstack/react-query';
import { orvalMutator } from '@/lib/orval-mutator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckInMethod = 'qr' | 'rfid' | 'manual' | 'app' | 'biometric';
export type CheckInResult = 'allowed' | 'blocked';

export interface AttendanceMember {
  _id:       string;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
}

export interface AttendanceBranch {
  _id:  string;
  name: string;
}

export interface AttendanceSubscription {
  endDate?:  string;
  status:    string;
  planName?: string;
}

export interface AttendanceRecord {
  _id:           string;
  timestamp:     string;
  method:        CheckInMethod;
  result:        CheckInResult;
  blockReason?:  string;
  notes?:        string;
  shiftId?:      string;
  shiftName?:    string;
  adminOverride?: boolean;
  member:        AttendanceMember | null;
  branch:        AttendanceBranch | null;
  subscription:  AttendanceSubscription | null;
}

export interface AttendanceListParams {
  page?:      number;
  limit?:     number;
  branchId?:  string;
  shiftId?:   string;
  result?:    CheckInResult;
  search?:    string;
  startDate?: string;
  endDate?:   string;
}

export interface AttendanceListResponse {
  data:       AttendanceRecord[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const listAttendance = (params: AttendanceListParams) => {
  const qs = new URLSearchParams();
  if (params.page)      qs.set('page',      String(params.page));
  if (params.limit)     qs.set('limit',     String(params.limit));
  if (params.branchId)  qs.set('branchId',  params.branchId);
  if (params.shiftId)   qs.set('shiftId',   params.shiftId);
  if (params.result)    qs.set('result',    params.result);
  if (params.search)    qs.set('search',    params.search);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate)   qs.set('endDate',   params.endDate);
  return orvalMutator<AttendanceListResponse>({ url: `/checkins?${qs}`, method: 'GET' });
};

export const recordQuickCheckIn = (data: { identifier: string; branchId?: string }) =>
  orvalMutator<{ data: { member: { name: string }; checkIn: { result: string; blockReason?: string } } }>(
    { url: '/checkins/quick', method: 'POST', headers: { 'Content-Type': 'application/json' }, data },
  );

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const attendanceKeys = {
  list: (params: AttendanceListParams) => ['attendance', params] as const,
};

export const useAttendance = (params: AttendanceListParams) =>
  useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn:  () => listAttendance(params),
    staleTime: 0,  // always refetch on mount so new check-ins appear immediately on navigation
  });
