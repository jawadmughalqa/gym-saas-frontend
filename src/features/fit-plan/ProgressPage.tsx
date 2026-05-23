import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import FeatureGate from '@/components/shared/FeatureGate';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ContributionGraph from './components/ContributionGraph';
import CheckInDialog from './components/CheckInDialog';
import { useMyFitPlan, useFitPlanStats, useFitPlanCheckIns } from './hooks/use-fit-plan';

// ─── Completion ring ──────────────────────────────────────────────────────────

function CompletionRing({ pct }: { pct: number }) {
  const r   = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={100} height={100} className="-rotate-90">
        <circle cx={50} cy={50} r={r} strokeWidth={10} className="stroke-muted fill-none" />
        <circle
          cx={50} cy={50} r={r}
          strokeWidth={10}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xl font-bold">{Math.round(pct)}%</span>
    </div>
  );
}

// ─── ProgressPage ─────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [checkInOpen, setCheckInOpen] = useState(false);

  const { data: planRes  } = useMyFitPlan();
  const { data: statsRes, isLoading: loadingStats } = useFitPlanStats();
  const { data: checkInsRes, isLoading: loadingCheckIns } = useFitPlanCheckIns({ limit: 24 });

  const plan        = planRes?.data?.plan;
  const stats       = statsRes?.data;
  const checkIns    = checkInsRes?.data ?? [];
  const contribution = stats?.contributionDays ?? [];

  // Build weight chart data — oldest first
  const weightData = [...checkIns].reverse().map((c) => ({
    date:   c.date ? format(new Date(c.date), 'MMM d') : '',
    weight: c.weight,
  }));

  // Weight delta: first vs last
  const firstWeight = checkIns[checkIns.length - 1]?.weight;
  const lastWeight  = checkIns[0]?.weight;
  const delta = firstWeight != null && lastWeight != null
    ? +(lastWeight - firstWeight).toFixed(1)
    : null;

  return (
    <FeatureGate feature="fitPlan" featureName="FitPlan">
    <PageShell>
      <PageHeader
        title="Progress"
        description="Track your weight and workout consistency"
        actions={
          <Button size="sm" onClick={() => setCheckInOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Log Check-In
          </Button>
        }
      />

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        {/* Completion rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              30-Day Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {loadingStats ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              <CompletionRing pct={stats?.completionRate ?? 0} />
            )}
            {!loadingStats && (
              <div className="text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground">{stats?.completedLast30 ?? 0}</span> completed</p>
                <p><span className="font-semibold text-foreground">{stats?.plannedLast30 ?? 0}</span> planned</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current weight */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Current Weight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingCheckIns ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-4xl font-bold">
                  {lastWeight != null ? `${lastWeight}` : '—'}
                  <span className="text-lg font-normal text-muted-foreground ml-1">kg</span>
                </div>
                {delta !== null && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    delta < 0 ? 'text-green-600' : delta > 0 ? 'text-orange-500' : 'text-muted-foreground'
                  }`}>
                    {delta < 0 ? <TrendingDown className="h-4 w-4" />
                     : delta > 0 ? <TrendingUp className="h-4 w-4" />
                     : <Minus className="h-4 w-4" />}
                    {delta > 0 ? '+' : ''}{delta} kg overall
                  </div>
                )}
                {plan?.targetWeight != null && (
                  <p className="text-xs text-muted-foreground">
                    Target: {plan.targetWeight} kg
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Streak summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Streak Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingStats ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">
                    {(stats?.streak as { currentStreak?: number })?.currentStreak ?? 0}
                  </span>
                  <span className="text-muted-foreground mb-1">day streak</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Best: {(stats?.streak as { longestStreak?: number })?.longestStreak ?? 0} days
                </p>
                {(stats?.streak as { tierLabel?: string; tierEmoji?: string })?.tierLabel && (
                  <p className="text-sm font-medium">
                    {(stats?.streak as { tierEmoji?: string })?.tierEmoji}{' '}
                    {(stats?.streak as { tierLabel?: string })?.tierLabel}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Weight chart ───────────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCheckIns ? (
            <Skeleton className="h-48 w-full" />
          ) : weightData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No check-ins yet — log your first weight above!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [`${v} kg`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Contribution graph ─────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Activity (Last 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ContributionGraph days={contribution} weeks={13} />
          )}
        </CardContent>
      </Card>

      <CheckInDialog open={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </PageShell>
    </FeatureGate>
  );
}
