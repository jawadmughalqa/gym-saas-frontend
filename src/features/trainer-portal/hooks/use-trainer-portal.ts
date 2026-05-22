import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface TrainerUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface TrainerBranch {
  _id: string;
  name: string;
}

export interface MyTrainerProfile {
  _id: string;
  userId: TrainerUser;
  branchIds?: TrainerBranch[];
  specializations?: string[];
  bio?: string;
  monthlyRate?: number;
  currency?: string;
  status?: string;
  availability?: string;
}

interface MyProfileResponse {
  success: boolean;
  data: MyTrainerProfile;
}

export interface AssignedMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
}

export interface TrainerAssignmentItem {
  _id: string;
  memberId: AssignedMember | string;
  status: 'active' | 'ended';
  startDate: string;
  endDate?: string;
  monthlyCharge?: number;
  currency?: string;
  goal?: string;
  sessionFrequencyPerWeek?: number;
  notes?: string;
}

interface AssignmentsResponse {
  success: boolean;
  data: TrainerAssignmentItem[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch the logged-in trainer's own profile */
export function useMyTrainerProfile() {
  return useQuery({
    queryKey: ['trainer-portal', 'profile'],
    queryFn: async () => {
      const res = await api.get<MyProfileResponse>('/trainers/me');
      return res.data.data;
    },
  });
}

/** Fetch all assignments for the logged-in trainer */
export function useMyAssignments(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer-portal', 'assignments', trainerId],
    queryFn: async () => {
      const res = await api.get<AssignmentsResponse>(
        `/trainers/${trainerId}/assignments`,
      );
      return res.data.data ?? [];
    },
    enabled: !!trainerId,
  });
}

/** Derived: only active assignments */
export function useMyActiveClients(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer-portal', 'assignments', trainerId, 'active'],
    queryFn: async () => {
      const res = await api.get<AssignmentsResponse>(
        `/trainers/${trainerId}/assignments`,
      );
      return (res.data.data ?? []).filter((a) => a.status === 'active');
    },
    enabled: !!trainerId,
  });
}
