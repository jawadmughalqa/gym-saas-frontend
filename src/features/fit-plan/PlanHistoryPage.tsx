import { format, parseISO } from 'date-fns';
import { ArrowLeft, Trophy, Flame, CheckCircle2, Calendar, Dumbbell, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeatureGate from '@/components/shared/FeatureGate';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePlanHistory } from './hooks/use-fit-plan';
import type { PlanHistoryEntry } from './hooks/use-fit-plan';

// ─── Config maps ──────────────────────────────────────────────────────────────

const GOAL_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  weight_loss: { label: 'Lose Weight',    emoji: '🔥', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  muscle_gain: { label: 'Build Muscle',   emoji: '💪', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/40'   },
  maintain:    { label: 'Stay Fit',       emoji: '⚖️', color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/40'  },
  endurance:   { label: 'Build Endurance',emoji: '🏃', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40'},
  recovery:    { label: 'Active Recovery',emoji: '🧘', color: 'text-teal-600',   bg: 'bg-teal-50 dark:bg-teal-950/40'   },
};

const FITNESS_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

// ─── Completion ring ──────────────────────────────────────────────────────────

function MiniRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const r    = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = circ * (Math.min(pct, 100) / 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={5} className="stroke-muted fill-none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={5}
          fill="none"
          stroke={color}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, index, total }: { plan: PlanHistoryEntry; index: number; total: number }) {
  const goal    = GOAL_CONFIG[plan.goal] ?? { label: plan.goal, emoji: '🏋️', color: 'text-foreground', bg: 'bg-muted/40' };
  const isActive = plan.status === 'active';

  const startFmt = plan.startDate
    ? format(parseISO(plan.startDate.slice(0, 10)), 'MMM d, yyyy')
    : '—';
  const endFmt = plan.lastWorkoutDate && !isActive
    ? format(parseISO(plan.lastWorkoutDate), 'MMM d, yyyy')
    : null;

  return (
    <div className="flex gap-4">
      {/* ── Timeline rail ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0 flex-shrink-0">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2',
          isActive
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-muted border-border text-muted-foreground',
        )}>
          {goal.emoji}
        </div>
        {index < total - 1 && (
          <div className="w-0.5 flex-1 bg-border min-h-[2rem] my-1" />
        )}
      </div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <Card className={cn(
        'flex-1 mb-4 overflow-hidden border',
        isActive && 'ring-2 ring-primary/40',
      )}>
        {/* Coloured header strip */}
        <div className={cn('px-4 py-3 flex items-center justify-between gap-3', goal.bg)}>
          <div className="flex items-center gap-2">
            <span className={cn('text-base font-bold', goal.color)}>{goal.label}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">{FITNESS_LABEL[plan.fitnessLevel] ?? plan.fitnessLevel}</span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">{plan.trainingDaysPerWeek}×/week</span>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn('text-[10px] px-2 py-0.5', isActive && 'bg-primary text-primary-foreground')}
          >
            {isActive ? 'Active' : 'Completed'}
          </Badge>
        </div>

        <CardContent className="px-4 py-4 space-y-4">
          {/* Date range */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{startFmt}</span>
            {endFmt && (
              <>
                <span>→</span>
                <span>{endFmt}</span>
              </>
            )}
            {isActive && <span className="text-primary font-medium">→ now</span>}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Completion rate */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 text-center">
              <MiniRing pct={plan.completionRate} />
              <div className="text-[10px] text-muted-foreground leading-tight">
                <span className="font-semibold text-foreground block">{plan.completedWorkouts}/{plan.totalWorkouts}</span>
                workouts done
              </div>
            </div>

            {/* Peak streak */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold tabular-nums">{plan.peakStreak}</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                <span className="font-semibold text-foreground block">peak streak</span>
                {plan.streakTierEmoji && plan.streakTier
                  ? `${plan.streakTierEmoji} ${plan.streakTier}`
                  : 'Getting Started'}
              </div>
            </div>

            {/* Weight */}
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 text-center">
              <div className="flex items-center gap-0.5">
                <span className="text-2xl font-bold tabular-nums">{plan.currentWeight}</span>
                <span className="text-xs text-muted-foreground mt-1.5">kg</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                <span className="font-semibold text-foreground block">start weight</span>
                {plan.targetWeight ? `target: ${plan.targetWeight} kg` : 'no target set'}
              </div>
            </div>
          </div>

          {/* Dietary restrictions */}
          {plan.dietaryRestrictions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.dietaryRestrictions.map((d) => (
                <Badge key={d} variant="outline" className="text-[10px] px-2 py-0.5 capitalize rounded-full">
                  {d.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          {/* Achievement badges */}
          <div className="flex flex-wrap gap-1.5">
            {plan.completionRate === 100 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> Perfect Completion
              </div>
            )}
            {plan.peakStreak >= 30 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                <Trophy className="h-3 w-3" /> 30-Day Warrior
              </div>
            )}
            {plan.peakStreak >= 7 && plan.peakStreak < 30 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 px-2 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                <Zap className="h-3 w-3" /> One Week Warrior
              </div>
            )}
            {plan.totalWorkouts >= 20 && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                <Dumbbell className="h-3 w-3" /> {plan.totalWorkouts}+ Sessions
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanHistoryPage() {
  return (
    <FeatureGate feature="fitPlan" featureName="FitPlan">
      <PlanHistoryContent />
    </FeatureGate>
  );
}

function PlanHistoryContent() {
  const navigate = useNavigate();
  const { data, isLoading } = usePlanHistory();
  const plans = data ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Plan History"
        description="Your fitness journey across all plans"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/member/fit-plan')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to FitPlan
          </Button>
        }
      />

      <div className="mt-6 max-w-2xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-5xl">📋</span>
            <p className="font-semibold text-lg">No plan history yet</p>
            <p className="text-sm text-muted-foreground">
              Your plans will appear here once you start tracking.
            </p>
            <Button className="mt-2" onClick={() => navigate('/member/fit-plan')}>
              Go to My FitPlan
            </Button>
          </div>
        ) : (
          <div>
            {/* Summary bar */}
            <div className="flex items-center gap-6 mb-6 px-1 text-sm text-muted-foreground">
              <span><span className="font-semibold text-foreground">{plans.length}</span> plan{plans.length !== 1 ? 's' : ''}</span>
              <span><span className="font-semibold text-foreground">{plans.reduce((s, p) => s + p.completedWorkouts, 0)}</span> total workouts</span>
              <span><span className="font-semibold text-foreground">{Math.max(...plans.map((p) => p.peakStreak))}</span> best streak</span>
            </div>

            {plans.map((plan, i) => (
              <PlanCard key={plan._id} plan={plan} index={i} total={plans.length} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
