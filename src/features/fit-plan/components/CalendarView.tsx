import { useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isBefore, startOfDay,
} from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkoutDay } from '@/api/generated/schemas';

// ─── Day type master config ───────────────────────────────────────────────────

const DAY_TYPE_CONFIG: Record<string, {
  emoji:  string;
  short:  string;      // shown inside the cell
  label:  string;      // shown in the legend
  planned: string;     // cell classes when status = planned
  text:    string;     // text colour for planned
}> = {
  chest:     { emoji: '💪', short: 'Chest',  label: 'Chest Day',   planned: 'bg-rose-50   border-rose-200   dark:bg-rose-950/40  dark:border-rose-800',   text: 'text-rose-700   dark:text-rose-300'   },
  back:      { emoji: '🏋️', short: 'Back',   label: 'Back Day',    planned: 'bg-blue-500/10   border-blue-500/25   dark:bg-blue-950/40  dark:border-blue-800',   text: 'text-blue-500   dark:text-blue-300'   },
  legs:      { emoji: '🦵', short: 'Legs',   label: 'Legs Day',    planned: 'bg-orange-500/10 border-orange-500/25 dark:bg-orange-950/40 dark:border-orange-800', text: 'text-orange-500 dark:text-orange-300' },
  arms:      { emoji: '🤜', short: 'Arms',   label: 'Arms Day',    planned: 'bg-purple-500/10 border-purple-500/25 dark:bg-purple-950/40 dark:border-purple-800', text: 'text-purple-500 dark:text-purple-300' },
  full_body: { emoji: '⚡', short: 'Full',   label: 'Full Body',   planned: 'bg-amber-500/10  border-amber-500/25  dark:bg-amber-950/40  dark:border-amber-800',  text: 'text-amber-500  dark:text-amber-300'  },
  cardio:    { emoji: '🏃', short: 'Cardio', label: 'Cardio',      planned: 'bg-green-500/10  border-green-500/25  dark:bg-green-950/40  dark:border-green-800',  text: 'text-green-500  dark:text-green-300'  },
  rest:      { emoji: '🧘', short: 'Rest',   label: 'Rest Day',    planned: 'bg-muted/60  border-border  dark:bg-slate-900/40  dark:border-slate-700',  text: 'text-muted-foreground  dark:text-slate-400'  },
};

// ─── Status-level overrides (applied on top of day-type colour) ───────────────

const STATUS_OVERRIDE: Record<string, string> = {
  completed: 'bg-emerald-500 border-emerald-400 dark:bg-emerald-600 dark:border-emerald-500',
  missed:    'bg-red-500/15     border-red-300     dark:bg-red-950/50  dark:border-red-800',
  frozen:    'bg-sky-100     border-sky-300     dark:bg-sky-950/40  dark:border-sky-700',
};

const STATUS_TEXT_OVERRIDE: Record<string, string> = {
  completed: 'text-white',
  missed:    'text-red-600   dark:text-red-400',
  frozen:    'text-sky-600   dark:text-sky-300',
};

// ─── Legend items ─────────────────────────────────────────────────────────────

const LEGEND = [
  { label: 'Completed', dot: 'bg-emerald-500' },
  { label: 'Planned',   dot: 'bg-primary/60' },
  { label: 'Missed',    dot: 'bg-red-400' },
  { label: 'Rest',      dot: 'bg-slate-300 dark:bg-slate-600' },
  { label: 'Frozen ❄️', dot: 'bg-sky-400' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarViewProps {
  year:       number;
  month:      number; // 1-12
  days:       WorkoutDay[];
  isLoading?: boolean;
  onDayClick?: (date: string) => void;
}

export default function CalendarView({ year, month, days, isLoading, onDayClick }: CalendarViewProps) {
  const dayMap = useMemo(() => {
    const m: Record<string, WorkoutDay> = {};
    days.forEach((d) => { if (d.date) m[d.date] = d; });
    return m;
  }, [days]);

  const monthStart  = startOfMonth(new Date(year, month - 1));
  const monthEnd    = endOfMonth(monthStart);
  const allDays     = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart); // 0 = Sun

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Weekday headers ─────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* ── Days grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Leading empty cells */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {allDays.map((date) => {
          const dateStr  = format(date, 'yyyy-MM-dd');
          const day      = dayMap[dateStr];
          const status   = day?.status ?? null;
          const dayType  = day?.dayType ?? null;
          const today    = isToday(date);
          const isPast   = isBefore(startOfDay(date), startOfDay(new Date()));
          const cfg      = dayType ? DAY_TYPE_CONFIG[dayType] : null;
          const hasData  = !!day;

          // Build cell classes
          const baseCell = cfg?.planned ?? '';
          const ovr      = status && STATUS_OVERRIDE[status];
          const bgClass  = ovr ?? (hasData ? baseCell : '');
          const textClass = status && STATUS_TEXT_OVERRIDE[status]
            ? STATUS_TEXT_OVERRIDE[status]
            : (cfg?.text ?? 'text-foreground');

          const isInteractive = hasData;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => isInteractive && onDayClick?.(dateStr)}
              disabled={!isInteractive}
              className={cn(
                'relative flex flex-col items-center justify-between py-1.5 px-0.5 h-14',
                'rounded-xl border transition-all duration-150 overflow-hidden',
                // Base colours
                bgClass || 'border-transparent',
                // Interactive states
                isInteractive
                  ? 'hover:scale-[1.04] hover:shadow-md cursor-pointer active:scale-100'
                  : 'cursor-default opacity-40',
                // Today ring
                today && 'ring-2 ring-primary ring-offset-1',
                // Past planned days get a subtle dimming so users know they may have missed
                !today && isPast && status === 'planned' && 'opacity-75',
              )}
            >
              {/* Date number */}
              <span className={cn(
                'text-xs font-bold leading-none',
                textClass,
                today && status !== 'completed' && 'text-primary',
              )}>
                {format(date, 'd')}
              </span>

              {/* Emoji */}
              {cfg && (
                <span className="text-sm leading-none select-none">
                  {status === 'missed'  ? '❌'
                  : status === 'frozen' ? '❄️'
                  : cfg.emoji}
                </span>
              )}

              {/* Short label */}
              {cfg && (
                <span className={cn(
                  'text-[8px] font-semibold leading-none truncate w-full text-center',
                  status === 'completed' ? 'text-white/90' : textClass,
                )}>
                  {cfg.short}
                </span>
              )}

              {/* Completed checkmark badge */}
              {status === 'completed' && (
                <span className="absolute top-0.5 right-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white/80" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-border/50">
        {LEGEND.map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
