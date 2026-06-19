import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Member, Subscription, CheckIn } from '@/types/member.types';
import type { Invoice } from '@/types/billing.types';

// ─── Response shapes ──────────────────────────────────────────────────────────

interface MyProfileResponse {
  success: boolean;
  data: Member;
}

interface MySubscriptionsResponse {
  success: boolean;
  data: Subscription[];
}

interface MyInvoicesData {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
}

interface MyInvoicesResponse {
  success: boolean;
  data: MyInvoicesData;
}

interface MyCheckInsData {
  checkIns: CheckIn[];
  total: number;
  page: number;
  limit: number;
}

interface MyCheckInsResponse {
  success: boolean;
  data: MyCheckInsData;
}

export interface TrainerInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specializations?: string[];
  bio?: string;
}

export interface AssignmentInfo {
  _id: string;
  goal?: string;
  sessionFrequencyPerWeek?: number;
  monthlyCharge?: number;
  startDate: string;
  status: string;
}

export interface MyTrainerData {
  trainer: TrainerInfo | null;
  assignment: AssignmentInfo | null;
}

interface MyTrainerResponse {
  success: boolean;
  data: MyTrainerData | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ['member-portal', 'profile'],
    queryFn: async () => {
      const res = await api.get<MyProfileResponse>('/members/me');
      return res.data.data;
    },
  });
}

export function useMySubscriptions() {
  return useQuery({
    queryKey: ['member-portal', 'subscriptions'],
    queryFn: async () => {
      const res = await api.get<MySubscriptionsResponse>('/members/me/subscriptions');
      return res.data.data ?? [];
    },
  });
}

export function useMyInvoices(status?: string) {
  return useQuery({
    queryKey: ['member-portal', 'invoices', status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status && status !== 'all') params.status = status;
      const res = await api.get<MyInvoicesResponse>('/members/me/invoices', { params });
      return res.data.data;
    },
  });
}

export function useMyCheckIns() {
  return useQuery({
    queryKey: ['member-portal', 'checkins'],
    queryFn: async () => {
      const res = await api.get<MyCheckInsResponse>('/members/me/checkins');
      return res.data.data ?? { checkIns: [], total: 0, page: 1, limit: 20 };
    },
  });
}

export function useMyTrainer() {
  return useQuery({
    queryKey: ['member-portal', 'trainer'],
    queryFn: async () => {
      const res = await api.get<MyTrainerResponse>('/members/me/trainer');
      return res.data.data;
    },
  });
}

// ─── Session Notes ────────────────────────────────────────────────────────────

export interface SessionNote {
  _id: string;
  sessionDate: string;
  content: string;
  durationMinutes?: number;
  tags?: string[];
  createdAt: string;
}

interface MySessionNotesResponse {
  success: boolean;
  data: { notes: SessionNote[]; total: number; page: number; limit: number };
}

export function useMySessionNotes() {
  return useQuery({
    queryKey: ['member-portal', 'session-notes'],
    queryFn: async () => {
      const res = await api.get<MySessionNotesResponse>('/members/me/session-notes');
      return res.data.data;
    },
  });
}

// ─── Trainer Rating ───────────────────────────────────────────────────────────

export interface MyTrainerRating {
  trainerId: string | null;
  rating: number | null;
  review?: string;
  canRateThisMonth: boolean;
  nextRatingDate: string | null;
}

interface MyTrainerRatingResponse {
  success: boolean;
  data: MyTrainerRating;
}

export function useMyTrainerRating() {
  return useQuery({
    queryKey: ['member-portal', 'trainer-rating'],
    queryFn: async () => {
      const res = await api.get<MyTrainerRatingResponse>('/members/me/trainer/rating');
      return res.data.data;
    },
  });
}

export function useRateMyTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { rating: number; review?: string }) =>
      api.post('/members/me/trainer/rate', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-portal', 'trainer-rating'] });
    },
  });
}
