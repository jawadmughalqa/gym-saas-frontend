import { useState } from 'react';
import { format, parseISO, isToday, isBefore, startOfDay } from 'date-fns';
import {
  CheckCircle2, Loader2, Utensils, Dumbbell, Droplets,
  Flame, Clock, ChevronRight, Apple, ArrowLeftRight,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFitPlanDay, useCompleteDay } from '../hooks/use-fit-plan';
import type { GetFitPlanCalendarParams, WorkoutDay } from '@/api/generated/schemas';
import SwapDaySheet from './SwapDaySheet';

// ─── Day type config ──────────────────────────────────────────────────────────

const DAY_TYPE_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  chest:     { emoji: '💪', label: 'Chest Day',      color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-950/40' },
  back:      { emoji: '🏋️', label: 'Back Day',       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/40' },
  legs:      { emoji: '🦵', label: 'Legs Day',       color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  arms:      { emoji: '🤜', label: 'Arms Day',       color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  full_body: { emoji: '⚡', label: 'Full Body',      color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
  cardio:    { emoji: '🏃', label: 'Cardio Day',     color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/40' },
  rest:      { emoji: '🧘', label: 'Rest Day',       color: 'text-slate-600',  bg: 'bg-slate-50 dark:bg-slate-950/40' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed',  className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  planned:   { label: 'Planned',    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  missed:    { label: 'Missed',     className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  frozen:    { label: 'Frozen ❄️',  className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' },
  rest:      { label: 'Rest Day',   className: 'bg-muted text-muted-foreground' },
};

interface DayDetailSheetProps {
  date:           string | null;
  calendarParams: GetFitPlanCalendarParams;
  /** Full calendar days array — used by SwapDaySheet to list candidates */
  days:           WorkoutDay[];
  onClose:        () => void;
}

export default function DayDetailSheet({ date, calendarParams, days, onClose }: DayDetailSheetProps) {
  const [swapOpen, setSwapOpen] = useState(false);
  const open = !!date;
  const { data: res, isLoading, isError } = useFitPlanDay(date ?? '');
  const complete = useCompleteDay(date ?? '', calendarParams);

  const detail    = res?.data;
  const day       = detail?.day;
  const exercises = detail?.exercises ?? [];
  const nutrition = detail?.nutrition;

  const isSelectedToday = date ? isToday(parseISO(date)) : false;
  const isPastDay       = date ? isBefore(startOfDay(parseISO(date)), startOfDay(new Date())) : false;
  // Only allow completing today's workout — not past or future days
  const canComplete     = day?.status === 'planned' && isSelectedToday;
  // Swap only makes sense for future/today planned days — past planned days can't be rescheduled
  const canSwap         = canComplete && day?.dayType !== 'rest' && !isPastDay;
  const alreadyDone     = day?.status === 'completed';

  const typeConfig   = DAY_TYPE_CONFIG[day?.dayType ?? ''] ?? DAY_TYPE_CONFIG['full_body'];
  const statusConfig = STATUS_CONFIG[day?.status ?? ''] ?? STATUS_CONFIG['planned'];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden">

        {/* ── Coloured header ─────────────────────────────────────────── */}
        <div className={cn('px-6 pt-6 pb-5', typeConfig.bg)}>
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">{typeConfig.emoji}</span>
              <div>
                <SheetTitle className={cn('text-lg font-bold leading-tight', typeConfig.color)}>
                  {typeConfig.label}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                  {date ? format(parseISO(date), 'EEEE, MMMM d') : ''}
                </SheetDescription>
              </div>
            </div>

            {/* Status + completed time */}
            {day && (
              <div className="flex items-center gap-2 pt-1">
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusConfig.className)}>
                  {statusConfig.label}
                </span>
                {alreadyDone && day.completedAt && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(day.completedAt), 'h:mm a')}
                  </span>
                )}
              </div>
            )}
          </SheetHeader>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          )}

          {/* Error / no data */}
          {!isLoading && (isError || !day) && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <span className="text-4xl">📅</span>
              <p className="font-medium text-sm">No workout for this day</p>
              <p className="text-xs text-muted-foreground">This day is not scheduled in your plan</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && day && (
            <>
              {/* ── Exercises ─────────────────────────────────────────── */}
              {exercises.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">
                      Exercises
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({exercises.length})
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <div
                        key={i}
                        className="rounded-xl border bg-card p-3.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-semibold text-sm leading-tight">{ex.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-md whitespace-nowrap">
                              {ex.sets} × {ex.reps}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-8.5">
                          {ex.rest && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Rest {ex.rest}
                            </span>
                          )}
                        </div>

                        {ex.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                            {ex.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                day.dayType !== 'rest' && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No exercises assigned for this day.
                  </div>
                )
              )}

              {/* ── Nutrition ─────────────────────────────────────────── */}
              {nutrition && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Utensils className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Nutrition Guide</h3>
                  </div>

                  {/* Macro stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {nutrition.proteinTargetG != null && (
                      <div className="rounded-xl bg-muted/60 p-3 text-center space-y-0.5">
                        <Flame className="h-4 w-4 text-orange-500 mx-auto" />
                        <div className="font-bold text-lg tabular-nums">{nutrition.proteinTargetG}g</div>
                        <div className="text-xs text-muted-foreground">Protein / day</div>
                      </div>
                    )}
                    {nutrition.hydrationL != null && (
                      <div className="rounded-xl bg-muted/60 p-3 text-center space-y-0.5">
                        <Droplets className="h-4 w-4 text-blue-500 mx-auto" />
                        <div className="font-bold text-lg tabular-nums">{nutrition.hydrationL}L</div>
                        <div className="text-xs text-muted-foreground">Hydration / day</div>
                      </div>
                    )}
                  </div>

                  {/* Pre / Post workout */}
                  {(nutrition.preWorkout || nutrition.postWorkout) && (
                    <div className="rounded-xl border divide-y">
                      {nutrition.preWorkout && (
                        <div className="px-3.5 py-2.5 flex gap-2.5">
                          <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Pre-workout</p>
                            <p className="text-sm leading-snug">{nutrition.preWorkout}</p>
                          </div>
                        </div>
                      )}
                      {nutrition.postWorkout && (
                        <div className="px-3.5 py-2.5 flex gap-2.5">
                          <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Post-workout</p>
                            <p className="text-sm leading-snug">{nutrition.postWorkout}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested foods */}
                  {(nutrition.suggestedFoods ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Apple className="h-3.5 w-3.5" />
                        Suggested foods
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {nutrition.suggestedFoods!.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs rounded-full px-2.5">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avoid */}
                  {(nutrition.avoid ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Avoid today</p>
                      <div className="flex flex-wrap gap-1.5">
                        {nutrition.avoid!.map((f) => (
                          <Badge
                            key={f}
                            variant="outline"
                            className="text-xs rounded-full px-2.5 border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {nutrition.notes && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-muted pl-3">
                      {nutrition.notes}
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        {/* ── Sticky footer CTA ────────────────────────────────────────── */}
        {(canComplete || canSwap) && (
          <div className="px-6 py-4 border-t bg-background space-y-2">
            {canComplete && (
              <Button
                className="w-full h-11 gap-2 text-sm font-semibold"
                onClick={() => complete.mutate({ date: date! })}
                disabled={complete.isPending}
              >
                {complete.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Mark as Complete
              </Button>
            )}
            {canSwap && (
              <Button
                variant="outline"
                className="w-full h-10 gap-2 text-sm"
                onClick={() => setSwapOpen(true)}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap with Another Day
              </Button>
            )}
          </div>
        )}

        {alreadyDone && (
          <div className="px-6 py-4 border-t bg-background">
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-5 w-5" />
              Workout completed!
            </div>
          </div>
        )}

      </SheetContent>

      {/* Swap picker — nested sheet */}
      {date && canSwap && (
        <SwapDaySheet
          sourceDate={date}
          sourceDayType={day.dayType ?? ''}
          days={days}
          calendarParams={calendarParams}
          open={swapOpen}
          onClose={() => setSwapOpen(false)}
          onSwapComplete={onClose}
        />
      )}

    </Sheet>
  );
}
