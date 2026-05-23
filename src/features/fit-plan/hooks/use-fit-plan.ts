import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import {
  useGetMyFitPlan,
  getGetMyFitPlanQueryKey,
  useSetupFitPlan,
  useUpdateFitPlan,
  useGetFitPlanStats,
  getGetFitPlanStatsQueryKey,
  useGetFitPlanStreak,
  getGetFitPlanStreakQueryKey,
  useUseStreakFreeze,
  useGetFitPlanCalendar,
  getGetFitPlanCalendarQueryKey,
  useBulkAssignFitPlanDays,
  useAssignFitPlanDay,
  useUpdateFitPlanDay,
  useGetFitPlanDay,
  getGetFitPlanDayQueryKey,
  useCompleteFitPlanDay,
  useCreateFitPlanCheckIn,
  useGetFitPlanCheckIns,
  getGetFitPlanCheckInsQueryKey,
} from '@/api/generated/fit-plan/fit-plan';
import type { GetFitPlanCalendarParams, GetFitPlanCheckInsParams } from '@/api/generated/schemas';

// ─── Query wrappers ───────────────────────────────────────────────────────────

export function useMyFitPlan() {
  return useGetMyFitPlan({ query: { staleTime: 1000 * 60 } });
}

export function useFitPlanStats() {
  return useGetFitPlanStats({ query: { staleTime: 1000 * 60 } });
}

export function useFitPlanStreak() {
  return useGetFitPlanStreak({ query: { staleTime: 1000 * 30 } });
}

export function useFitPlanCalendar(params: GetFitPlanCalendarParams) {
  return useGetFitPlanCalendar(params, {
    query: { staleTime: 1000 * 30, enabled: !!params.month && !!params.year },
  });
}

export function useFitPlanDay(date: string) {
  return useGetFitPlanDay(date, {
    query: { staleTime: 1000 * 60 * 5, enabled: !!date },
  });
}

export function useFitPlanCheckIns(params?: GetFitPlanCheckInsParams) {
  return useGetFitPlanCheckIns(params, { query: { staleTime: 1000 * 60 * 5 } });
}

// ─── Invalidation helper ──────────────────────────────────────────────────────

function useInvalidateFitPlan() {
  const qc = useQueryClient();
  return (date?: string, calendarParams?: GetFitPlanCalendarParams) => {
    qc.invalidateQueries({ queryKey: getGetMyFitPlanQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFitPlanStreakQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFitPlanStatsQueryKey() });
    if (date) {
      qc.invalidateQueries({ queryKey: getGetFitPlanDayQueryKey(date) });
    }
    if (calendarParams) {
      qc.invalidateQueries({ queryKey: getGetFitPlanCalendarQueryKey(calendarParams) });
    }
  };
}

// ─── Mutation wrappers ────────────────────────────────────────────────────────

export function useSetupFitPlanMutation() {
  const invalidate = useInvalidateFitPlan();
  return useSetupFitPlan({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: 'FitPlan created', description: 'Your fitness plan is ready!' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Failed to create FitPlan', description: getErrorMessage(err) });
      },
    },
  });
}

export function useUpdateFitPlanMutation() {
  const invalidate = useInvalidateFitPlan();
  return useUpdateFitPlan({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: 'FitPlan updated' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Update failed', description: getErrorMessage(err) });
      },
    },
  });
}

export function useCompleteDay(date: string, calendarParams: GetFitPlanCalendarParams) {
  const invalidate = useInvalidateFitPlan();
  return useCompleteFitPlanDay({
    mutation: {
      onSuccess: (res) => {
        const streak = res.data?.data?.streak;
        invalidate(date, calendarParams);
        toast({
          title: 'Workout logged! 💪',
          description: streak
            ? `${streak.tierEmoji ?? '🔥'} ${streak.currentStreak}-day streak — ${streak.tierLabel}`
            : 'Keep it up!',
        });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Could not log workout', description: getErrorMessage(err) });
      },
    },
  });
}

export function useAssignDay(calendarParams: GetFitPlanCalendarParams) {
  const invalidate = useInvalidateFitPlan();
  return useAssignFitPlanDay({
    mutation: {
      onSuccess: (_, vars) => {
        invalidate(vars.date, calendarParams);
        toast({ title: 'Day assigned' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Failed to assign day', description: getErrorMessage(err) });
      },
    },
  });
}

export function useBulkAssign(calendarParams: GetFitPlanCalendarParams) {
  const qc = useQueryClient();
  return useBulkAssignFitPlanDays({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetFitPlanCalendarQueryKey(calendarParams) });
        toast({ title: 'Calendar updated' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Bulk assign failed', description: getErrorMessage(err) });
      },
    },
  });
}

export function useUpdateDayMutation(date: string, calendarParams: GetFitPlanCalendarParams) {
  const invalidate = useInvalidateFitPlan();
  return useUpdateFitPlanDay({
    mutation: {
      onSuccess: () => {
        invalidate(date, calendarParams);
        toast({ title: 'Day updated' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Update failed', description: getErrorMessage(err) });
      },
    },
  });
}

export function useUseFreeze(calendarParams: GetFitPlanCalendarParams) {
  const invalidate = useInvalidateFitPlan();
  return useUseStreakFreeze({
    mutation: {
      onSuccess: (_, vars) => {
        invalidate((vars as { date: string }).date, calendarParams);
        toast({ title: 'Streak freeze applied ❄️', description: 'Your streak is protected.' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Freeze failed', description: getErrorMessage(err) });
      },
    },
  });
}

export function useCheckInMutation() {
  const qc = useQueryClient();
  return useCreateFitPlanCheckIn({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetFitPlanCheckInsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFitPlanStatsQueryKey() });
        toast({ title: 'Check-in logged ✅' });
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Check-in failed', description: getErrorMessage(err) });
      },
    },
  });
}
