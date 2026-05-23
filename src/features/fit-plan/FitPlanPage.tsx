import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import GoalSetupFlow from './GoalSetupFlow';
import StreakCard from './components/StreakCard';
import CalendarView from './components/CalendarView';
import WeekView from './components/WeekView';
import DayDetailSheet from './components/DayDetailSheet';
import {
  useMyFitPlan,
  useFitPlanStreak,
  useFitPlanCalendar,
  useUseFreeze,
} from './hooks/use-fit-plan';

export default function FitPlanPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit plan flow state
  const [showConfirm, setShowConfirm] = useState(false);
  const [editMode, setEditMode]       = useState(false);

  const month = currentDate.getMonth() + 1;
  const year  = currentDate.getFullYear();
  const calendarParams = { month, year };

  const { data: fitPlanRes, isLoading: loadingPlan, refetch: refetchPlan } = useMyFitPlan();
  const { data: streakRes,  isLoading: loadingStreak } = useFitPlanStreak();
  const { data: calRes,     isLoading: loadingCal }  = useFitPlanCalendar(calendarParams);
  const useFreeze = useUseFreeze(calendarParams);

  // orvalMutator returns res.data (the full response body: { success, data })
  // so fitPlanRes = { success, data: { plan, streak } }  →  one .data level
  const planData = fitPlanRes?.data;
  const hasPlan  = !!planData?.plan;
  const streak   = streakRes?.data ?? planData?.streak;
  // calendar returns { success, data: { planId, goal, month, year, days: WorkoutDay[] } }
  // orval typed this as `void` so we cast through unknown
  const calPayload = (calRes as unknown as { data?: { days?: import('@/api/generated/schemas').WorkoutDay[] } } | undefined);
  const days = calPayload?.data?.days ?? [];

  function handleFreeze() {
    const today = format(new Date(), 'yyyy-MM-dd');
    useFreeze.mutate({ data: { date: today } });
  }

  function handleEditConfirmed() {
    setShowConfirm(false);
    setEditMode(true);
  }

  function handleEditComplete() {
    setEditMode(false);
    void refetchPlan();
  }

  if (loadingPlan) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40 md:col-span-2" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </PageShell>
    );
  }

  // ── No plan yet — show setup flow ─────────────────────────────────────────
  if (!hasPlan) {
    return (
      <PageShell>
        <GoalSetupFlow onComplete={() => refetchPlan()} />
      </PageShell>
    );
  }

  const plan = planData!.plan!;

  // ── Edit mode — show pre-filled setup flow ────────────────────────────────
  if (editMode) {
    return (
      <PageShell>
        <GoalSetupFlow
          mode="edit"
          initialValues={{
            goal:                (plan.goal as 'weight_loss' | 'muscle_gain' | 'maintain' | 'endurance' | 'recovery') ?? 'weight_loss',
            currentWeight:       plan.currentWeight,
            targetWeight:        plan.targetWeight ?? '',
            activityLevel:       (plan.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active') ?? 'moderate',
            fitnessLevel:        (plan.fitnessLevel as 'beginner' | 'intermediate' | 'advanced') ?? 'beginner',
            trainingDaysPerWeek: plan.trainingDaysPerWeek ?? 4,
            dietaryRestrictions: plan.dietaryRestrictions ?? [],
          }}
          onComplete={handleEditComplete}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="My FitPlan"
        description={`${plan.goal?.replace('_', ' ')} · ${plan.fitnessLevel} · ${plan.trainingDaysPerWeek}×/week`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/member/fit-plan/progress')}>
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Progress
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
              <Settings2 className="h-4 w-4 mr-1.5" />
              Change Goal
            </Button>
          </div>
        }
      />

      {/* Top row: streak + week view */}
      <div className="grid gap-4 md:grid-cols-3 mt-4">
        <StreakCard
          streak={streak}
          isLoading={loadingStreak}
          onUseFreeze={handleFreeze}
          freezeLoading={useFreeze.isPending}
        />

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeekView
              referenceDate={currentDate}
              days={days}
              onDayClick={setSelectedDay}
            />
          </CardContent>
        </Card>
      </div>

      {/* Monthly calendar */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate((d) => subMonths(d, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarView
            year={year}
            month={month}
            days={days}
            isLoading={loadingCal}
            onDayClick={setSelectedDay}
          />
        </CardContent>
      </Card>

      {/* Day detail sheet */}
      <DayDetailSheet
        date={selectedDay}
        calendarParams={calendarParams}
        days={days}
        onClose={() => setSelectedDay(null)}
      />

      {/* Change goal confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your FitPlan goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching goals will regenerate your upcoming workouts based on your new settings.
              Your completed workouts, streak, and progress history are fully preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditConfirmed}>
              Yes, update my plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
