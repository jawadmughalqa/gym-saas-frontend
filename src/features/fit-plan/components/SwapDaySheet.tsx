import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeftRight, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkoutDay } from '@/api/generated/schemas';
import type { GetFitPlanCalendarParams } from '@/api/generated/schemas';
import { useSwapDays } from '../hooks/use-fit-plan';

// ─── Day type display config ──────────────────────────────────────────────────

const DAY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  chest:     { emoji: '💪', label: 'Chest Day',   color: 'text-rose-600'   },
  back:      { emoji: '🏋️', label: 'Back Day',    color: 'text-blue-600'   },
  legs:      { emoji: '🦵', label: 'Legs Day',    color: 'text-orange-600' },
  arms:      { emoji: '🤜', label: 'Arms Day',    color: 'text-purple-600' },
  full_body: { emoji: '⚡', label: 'Full Body',   color: 'text-yellow-600' },
  cardio:    { emoji: '🏃', label: 'Cardio Day',  color: 'text-green-600'  },
};

function getDayConfig(dayType: string) {
  return DAY_CONFIG[dayType] ?? { emoji: '📅', label: dayType, color: 'text-foreground' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SwapDaySheetProps {
  /** The date being swapped FROM (already open in DayDetailSheet) */
  sourceDate:     string;
  sourceDayType:  string;
  /** All calendar days — used to build the picker list */
  days:           WorkoutDay[];
  calendarParams: GetFitPlanCalendarParams;
  open:           boolean;
  onClose:        () => void;
  /** Called after a successful swap so the parent sheet can close too */
  onSwapComplete: () => void;
}

// ─── SwapDaySheet ─────────────────────────────────────────────────────────────

export default function SwapDaySheet({
  sourceDate,
  sourceDayType,
  days,
  calendarParams,
  open,
  onClose,
  onSwapComplete,
}: SwapDaySheetProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const swap = useSwapDays(calendarParams);

  // Only show future planned, non-rest days that are not the source
  const today = format(new Date(), 'yyyy-MM-dd');
  const candidates = days.filter(
    (d) =>
      d.date !== sourceDate &&
      d.status === 'planned' &&
      d.dayType !== 'rest' &&
      d.date >= today,
  );

  const selectedDay = candidates.find((d) => d.date === selectedDate);
  const sourceConfig   = getDayConfig(sourceDayType);
  const selectedConfig = selectedDay ? getDayConfig(selectedDay.dayType) : null;

  function handleConfirm() {
    if (!selectedDate) return;
    swap.mutate(
      { date1: sourceDate, date2: selectedDate },
      {
        onSuccess: () => {
          setSelectedDate(null);
          onSwapComplete();
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setSelectedDate(null);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base font-bold">Swap Workout Day</SheetTitle>
            </div>
            <SheetDescription className="text-sm">
              Moving{' '}
              <span className={cn('font-semibold', sourceConfig.color)}>
                {sourceConfig.emoji} {sourceConfig.label}
              </span>{' '}
              on{' '}
              <span className="font-semibold text-foreground">
                {format(parseISO(sourceDate), 'EEE, MMM d')}
              </span>
              . Pick a day below to swap it with.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* ── Day list ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2 text-muted-foreground">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-medium">No upcoming planned days to swap with</p>
              <p className="text-xs">Only future planned training days can be swapped.</p>
            </div>
          ) : (
            candidates.map((day) => {
              const cfg      = getDayConfig(day.dayType);
              const isSelected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : day.date)}
                  className={cn(
                    'w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 bg-card',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{cfg.emoji}</span>
                    <div>
                      <p className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(day.date), 'EEEE, MMMM d')}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Confirmation footer ──────────────────────────────────────── */}
        {selectedDay && selectedConfig && (
          <div className="px-6 py-4 border-t bg-background space-y-3">
            {/* Preview */}
            <div className="rounded-xl bg-muted/60 px-4 py-3 flex items-center justify-between text-sm gap-2">
              <div className="text-center flex-1">
                <p className={cn('font-semibold', selectedConfig.color)}>
                  {selectedConfig.emoji} {selectedConfig.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(sourceDate), 'EEE, MMM d')}
                </p>
              </div>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="text-center flex-1">
                <p className={cn('font-semibold', sourceConfig.color)}>
                  {sourceConfig.emoji} {sourceConfig.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(selectedDay.date), 'EEE, MMM d')}
                </p>
              </div>
            </div>

            <Button
              className="w-full h-11 gap-2 text-sm font-semibold"
              onClick={handleConfirm}
              disabled={swap.isPending}
            >
              {swap.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Confirm Swap
            </Button>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
