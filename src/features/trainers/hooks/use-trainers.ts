import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTrainers, getTrainer, createTrainer, updateTrainer, archiveTrainer,
  listAssignments, createAssignment, endAssignment,
  listNotes, createNote, updateNote,
  getTrainerRatings, rateTrainer,
} from '@/api/trainer.api';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import type {
  ListTrainersQuery, ListNotesQuery,
  CreateTrainerDto, UpdateTrainerDto,
  CreateAssignmentDto, EndAssignmentDto,
  CreateTrainingNoteDto, UpdateTrainingNoteDto,
  CreateRatingDto,
} from '@/types/trainer.types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const trainerKeys = {
  all:         ['trainers'] as const,
  lists:       () => [...trainerKeys.all, 'list'] as const,
  list:        (q: ListTrainersQuery) => [...trainerKeys.lists(), q] as const,
  details:     () => [...trainerKeys.all, 'detail'] as const,
  detail:      (id: string) => [...trainerKeys.details(), id] as const,
  assignments: (id: string) => [...trainerKeys.detail(id), 'assignments'] as const,
  notes:       (id: string, q?: ListNotesQuery) => [...trainerKeys.detail(id), 'notes', q] as const,
  ratings:     (id: string) => [...trainerKeys.detail(id), 'ratings'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTrainers(query: ListTrainersQuery) {
  return useQuery({
    queryKey: trainerKeys.list(query),
    queryFn: () => listTrainers(query),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useTrainer(trainerId: string) {
  return useQuery({
    queryKey: trainerKeys.detail(trainerId),
    queryFn: () => getTrainer(trainerId),
    enabled: !!trainerId,
  });
}

export function useTrainerAssignments(trainerId: string) {
  return useQuery({
    queryKey: trainerKeys.assignments(trainerId),
    queryFn: () => listAssignments(trainerId),
    enabled: !!trainerId,
  });
}

export function useTrainerNotes(trainerId: string, query: ListNotesQuery = {}) {
  return useQuery({
    queryKey: trainerKeys.notes(trainerId, query),
    queryFn: () => listNotes(trainerId, query),
    enabled: !!trainerId,
    placeholderData: (prev) => prev,
  });
}

export function useTrainerRatings(trainerId: string) {
  return useQuery({
    queryKey: trainerKeys.ratings(trainerId),
    queryFn: () => getTrainerRatings(trainerId),
    enabled: !!trainerId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTrainer(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrainerDto) => createTrainer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.lists() });
      toast({ title: 'Trainer profile created' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to create trainer', description: getErrorMessage(err) }),
  });
}

export function useUpdateTrainer(trainerId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTrainerDto) => updateTrainer(trainerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.detail(trainerId) });
      qc.invalidateQueries({ queryKey: trainerKeys.lists() });
      toast({ title: 'Trainer updated' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to update trainer', description: getErrorMessage(err) }),
  });
}

export function useArchiveTrainer(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trainerId: string) => archiveTrainer(trainerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.lists() });
      toast({ title: 'Trainer archived' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to archive trainer', description: getErrorMessage(err) }),
  });
}

export function useCreateAssignment(trainerId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAssignmentDto) => createAssignment(trainerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.assignments(trainerId) });
      qc.invalidateQueries({ queryKey: trainerKeys.detail(trainerId) });
      toast({ title: 'Member assigned' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to assign member', description: getErrorMessage(err) }),
  });
}

export function useEndAssignment(trainerId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, body }: { assignmentId: string; body: EndAssignmentDto }) =>
      endAssignment(trainerId, assignmentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.assignments(trainerId) });
      qc.invalidateQueries({ queryKey: trainerKeys.detail(trainerId) });
      toast({ title: 'Assignment ended' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to end assignment', description: getErrorMessage(err) }),
  });
}

export function useCreateNote(trainerId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrainingNoteDto) => createNote(trainerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.notes(trainerId) });
      toast({ title: 'Session note saved' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to save note', description: getErrorMessage(err) }),
  });
}

export function useUpdateNote(trainerId: string, noteId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTrainingNoteDto) => updateNote(trainerId, noteId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.notes(trainerId) });
      toast({ title: 'Note updated' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to update note', description: getErrorMessage(err) }),
  });
}

export function useRateTrainer(trainerId: string, memberId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRatingDto) => rateTrainer(trainerId, memberId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainerKeys.ratings(trainerId) });
      qc.invalidateQueries({ queryKey: trainerKeys.detail(trainerId) });
      toast({ title: 'Rating submitted' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to submit rating', description: getErrorMessage(err) }),
  });
}
