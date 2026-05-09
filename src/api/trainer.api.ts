import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type {
  TrainerProfile, TrainerAssignment, TrainingNote, TrainerRating,
  TrainerListResponse, AssignmentListResponse, TrainingNoteListResponse, TrainerRatingListResponse,
  ListTrainersQuery, ListNotesQuery,
  CreateTrainerDto, UpdateTrainerDto,
  CreateAssignmentDto, EndAssignmentDto,
  CreateTrainingNoteDto, UpdateTrainingNoteDto,
  CreateRatingDto,
} from '@/types/trainer.types';

// ─── Trainer Profiles ─────────────────────────────────────────────────────────

export async function listTrainers(query: ListTrainersQuery) {
  const { data } = await api.get<ApiResponse<TrainerListResponse>>('/trainers', { params: query });
  return data.data;
}

export async function getTrainer(trainerId: string) {
  const { data } = await api.get<ApiResponse<TrainerProfile>>(`/trainers/${trainerId}`);
  return data.data;
}

export async function createTrainer(body: CreateTrainerDto) {
  const { data } = await api.post<ApiResponse<TrainerProfile>>('/trainers', body);
  return data.data;
}

export async function updateTrainer(trainerId: string, body: UpdateTrainerDto) {
  const { data } = await api.patch<ApiResponse<TrainerProfile>>(`/trainers/${trainerId}`, body);
  return data.data;
}

export async function archiveTrainer(trainerId: string) {
  const { data } = await api.delete<ApiResponse<{ message: string }>>(`/trainers/${trainerId}`);
  return data.data;
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function listAssignments(trainerId: string) {
  const { data } = await api.get<ApiResponse<AssignmentListResponse>>(`/trainers/${trainerId}/assignments`);
  return data.data.assignments;
}

export async function createAssignment(trainerId: string, body: CreateAssignmentDto) {
  const { data } = await api.post<ApiResponse<TrainerAssignment>>(`/trainers/${trainerId}/assignments`, body);
  return data.data;
}

export async function endAssignment(trainerId: string, assignmentId: string, body: EndAssignmentDto) {
  const { data } = await api.post<ApiResponse<TrainerAssignment>>(
    `/trainers/${trainerId}/assignments/${assignmentId}/end`,
    body,
  );
  return data.data;
}

// ─── Training Notes ───────────────────────────────────────────────────────────

export async function listNotes(trainerId: string, query: ListNotesQuery = {}) {
  const { data } = await api.get<ApiResponse<TrainingNoteListResponse>>(
    `/trainers/${trainerId}/notes`,
    { params: query },
  );
  return data.data;
}

export async function createNote(trainerId: string, body: CreateTrainingNoteDto) {
  const { data } = await api.post<ApiResponse<TrainingNote>>(`/trainers/${trainerId}/notes`, body);
  return data.data;
}

export async function updateNote(trainerId: string, noteId: string, body: UpdateTrainingNoteDto) {
  const { data } = await api.patch<ApiResponse<TrainingNote>>(
    `/trainers/${trainerId}/notes/${noteId}`,
    body,
  );
  return data.data;
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

export async function getTrainerRatings(trainerId: string) {
  const { data } = await api.get<ApiResponse<TrainerRatingListResponse>>(`/trainers/${trainerId}/ratings`);
  return data.data.ratings;
}

export async function rateTrainer(trainerId: string, memberId: string, body: CreateRatingDto) {
  const { data } = await api.post<ApiResponse<TrainerRating>>(
    `/trainers/${trainerId}/ratings/${memberId}`,
    body,
  );
  return data.data;
}
