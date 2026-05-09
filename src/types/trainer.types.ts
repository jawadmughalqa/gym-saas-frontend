import type { PaginationMeta } from './api.types';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TrainerStatus = 'active' | 'inactive' | 'on_leave';
export type AssignmentStatus = 'active' | 'paused' | 'ended';
export type NoteVisibility = 'trainer_only' | 'staff_visible' | 'member_visible';

// ─── Sub-objects ──────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  day: number;        // 0 = Sunday … 6 = Saturday
  startTime: string;  // "09:00"
  endTime: string;    // "17:00"
}

export interface TrainerUserRef {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface AssignmentMemberRef {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface RatingMemberRef {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface NoteMemberRef {
  _id: string;
  firstName: string;
  lastName: string;
}

// ─── Main entities ────────────────────────────────────────────────────────────

export interface TrainerProfile {
  _id: string;
  tenantId: string;
  userId: TrainerUserRef;
  branchIds: string[];
  specializations: string[];
  certifications: string[];
  bio?: string;
  experienceYears?: number;
  maxClients: number;
  currentClientCount: number;
  availability: AvailabilitySlot[];
  hourlyRate?: number;
  currency: string;
  status: TrainerStatus;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerAssignment {
  _id: string;
  tenantId: string;
  trainerId: string;
  memberId: AssignmentMemberRef;
  branchId: string;
  status: AssignmentStatus;
  startDate: string;
  endDate?: string;
  goal?: string;
  sessionFrequencyPerWeek?: number;
  notes?: string;
  endReason?: string;
  createdAt: string;
}

export interface TrainingNote {
  _id: string;
  tenantId: string;
  trainerId: string;
  memberId: NoteMemberRef;
  assignmentId?: string;
  sessionDate: string;
  content: string;
  visibility: NoteVisibility;
  durationMinutes?: number;
  sessionRating?: number;
  tags: string[];
  createdAt: string;
}

export interface TrainerRating {
  _id: string;
  trainerId: string;
  memberId: RatingMemberRef;
  rating: number;
  review?: string;
  isVisible: boolean;
  createdAt: string;
}

// ─── List responses ───────────────────────────────────────────────────────────

export interface TrainerListResponse {
  trainers: TrainerProfile[];
  pagination: PaginationMeta;
}

export interface AssignmentListResponse {
  assignments: TrainerAssignment[];
}

export interface TrainingNoteListResponse {
  notes: TrainingNote[];
  pagination: PaginationMeta;
}

export interface TrainerRatingListResponse {
  ratings: TrainerRating[];
}

// ─── Query types ──────────────────────────────────────────────────────────────

export interface ListTrainersQuery {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: TrainerStatus;
  specialization?: string;
  availableOnly?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListNotesQuery {
  memberId?: string;
  page?: number;
  limit?: number;
  visibility?: NoteVisibility;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateTrainerDto {
  userId: string;
  branchIds: string[];
  specializations?: string[];
  certifications?: string[];
  bio?: string;
  experienceYears?: number;
  maxClients?: number;
  availability?: AvailabilitySlot[];
  hourlyRate?: number;
  currency?: string;
}

export interface UpdateTrainerDto {
  branchIds?: string[];
  specializations?: string[];
  certifications?: string[];
  bio?: string;
  experienceYears?: number;
  maxClients?: number;
  availability?: AvailabilitySlot[];
  hourlyRate?: number;
  currency?: string;
  status?: TrainerStatus;
}

export interface CreateAssignmentDto {
  memberId: string;
  branchId: string;
  goal?: string;
  sessionFrequencyPerWeek?: number;
  notes?: string;
  startDate?: string;
}

export interface EndAssignmentDto {
  reason: string;
}

export interface CreateTrainingNoteDto {
  memberId: string;
  sessionDate: string;
  content: string;
  visibility?: NoteVisibility;
  durationMinutes?: number;
  sessionRating?: number;
  tags?: string[];
  assignmentId?: string;
}

export interface UpdateTrainingNoteDto {
  content?: string;
  visibility?: NoteVisibility;
  durationMinutes?: number;
  sessionRating?: number;
  tags?: string[];
}

export interface CreateRatingDto {
  rating: number;
  review?: string;
  assignmentId?: string;
}
