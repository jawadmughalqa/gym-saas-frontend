import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, Settings2, History, Target, Scale, Activity, Dumbbell, Calendar, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeatureGate from '@/components/shared/FeatureGate';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// ─── Config labels ────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, { label: string; emoji: string }> = {
  weight_loss: { label: 'Lose Weight',     emoji: '🔥' },
  muscle_gain: { label: 'Build Muscle',    emoji: '💪' },
  maintain:    { label: 'Stay Fit',        emoji: '⚖️' },
  endurance:   { label: 'Build Endurance', emoji: '🏃' },
  recovery:    { label: 'Active Recovery', emoji: '🧘' },
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:  'Sedentary',
  light:      'Lightly Active',
  moderate:   'Moderately Active',
  active:     'Very Active',
  very_active:'Extra Active',
};

const FITNESS_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

// ─── Plan Details Card ────────────────────────────────────────────────────────

function PlanDetailsCard({
  plan,
  onEdit,
}: {
  plan: import('@/api/generated/schemas').FitPlan;
  onEdit: () => void;
}) {
  const goal = GOAL_LABELS[plan.goal ?? ''] ?? { label: plan.goal ?? '', emoji: '🏋️' };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your Plan Settings
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onEdit}>
          <Settings2 className="h-3.5 w-3.5" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Goal */}
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Goal</p>
              <p className="text-sm font-semibold">{goal.emoji} {goal.label}</p>
            </div>
          </div>

          {/* Fitness level */}
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Dumbbell className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Fitness Level</p>
              <p className="text-sm font-semibold">{FITNESS_LABELS[plan.fitnessLevel ?? ''] ?? plan.fitnessLevel}</p>
            </div>
          </div>

          {/* Training days */}
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Training Days</p>
              <p className="text-sm font-semibold">{plan.trainingDaysPerWeek}× per week</p>
            </div>
          </div>

          {/* Activity level */}
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Activity className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Activity Level</p>
              <p className="text-sm font-semibold">{ACTIVITY_LABELS[plan.activityLevel ?? ''] ?? plan.activityLevel}</p>
            </div>
          </div>

          {/* Current & target weight */}
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <Scale className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Weight</p>
              <p className="text-sm font-semibold">
                {plan.currentWeight} kg
                {plan.targetWeight != null && (
                  <span className="text-muted-foreground font-normal"> → {plan.targetWeight} kg</span>
                )}
              </p>
            </div>
          </div>

          {/* Dietary restrictions */}
          {(plan.dietaryRestrictions ?? []).length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
              <Leaf className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Diet</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(plan.dietaryRestrictions ?? []).map((d: string) => (
                    <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full capitalize">
                      {d.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FitPlanPage() {
  return (
    <FeatureGate feature="fitPlan" featureName="FitPlan">
      <FitPlanPageContent />
    </FeatureGate>
  );
}

function FitPlanPageContent() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit plan flow state
  const [showConfirm, setShowConfirm] = useState(false);
  const [editMode, setEditMode]       = useState(false);

  const month = currentDate.getMonth() + 1;
  const year  = currentDate.getFullYear();
  const calendarParams = { month, year };

  const { data: fitPlanRes, isLoading: loadingPlan } = useMyFitPlan();
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
    // cache already invalidated+awaited inside the mutation hook before onComplete fires
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
        <GoalSetupFlow />
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
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/member/fit-plan/history')}>
              <History className="h-4 w-4 mr-1.5" />
              History
            </Button>
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

      {/* Plan settings card — shows all current plan details */}
      <PlanDetailsCard plan={plan} onEdit={() => setShowConfirm(true)} />

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
              referenceDate={new Date()}
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
              If you change your <strong>goal</strong> or <strong>training days per week</strong>,
              your current plan will be archived and a new one will start fresh — including a new streak from zero.
              Your completed workouts and progress history are fully preserved in Plan History.
              <br /><br />
              Changing only your weight, activity level, fitness level, or dietary restrictions updates your current plan in place with no streak reset.
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
