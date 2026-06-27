import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorkoutDay } from '@/api/generated/schemas';

// ─── Day type config ──────────────────────────────────────────────────────────

const DAY_TYPE_CONFIG: Record<string, {
  emoji:   string;
  label:   string;
  dateBg:  string;   // circle behind the date number when planned
  dateText: string;
  cardBg:  string;   // overall card background
  border:  string;
}> = {
  chest:     { emoji: '💪', label: 'Chest',  dateBg: 'bg-rose-500',   dateText: 'text-white', cardBg: 'bg-rose-50   dark:bg-rose-950/40',   border: 'border-rose-200   dark:border-rose-800'   },
  back:      { emoji: '🏋️', label: 'Back',   dateBg: 'bg-blue-500',   dateText: 'text-white', cardBg: 'bg-blue-500/10   dark:bg-blue-950/40',   border: 'border-blue-500/25   dark:border-blue-800'   },
  legs:      { emoji: '🦵', label: 'Legs',   dateBg: 'bg-orange-500', dateText: 'text-white', cardBg: 'bg-orange-500/10 dark:bg-orange-950/40', border: 'border-orange-500/25 dark:border-orange-800' },
  arms:      { emoji: '🤜', label: 'Arms',   dateBg: 'bg-purple-500', dateText: 'text-white', cardBg: 'bg-purple-500/10 dark:bg-purple-950/40', border: 'border-purple-500/25 dark:border-purple-800' },
  full_body: { emoji: '⚡', label: 'Full',   dateBg: 'bg-amber-500',  dateText: 'text-white', cardBg: 'bg-amber-500/10  dark:bg-amber-950/40',  border: 'border-amber-500/25  dark:border-amber-800'  },
  cardio:    { emoji: '🏃', label: 'Cardio', dateBg: 'bg-green-500',  dateText: 'text-white', cardBg: 'bg-green-500/10  dark:bg-green-950/40',  border: 'border-green-500/25  dark:border-green-800'  },
  rest:      { emoji: '🧘', label: 'Rest',   dateBg: 'bg-slate-400',  dateText: 'text-white', cardBg: 'bg-muted/60  dark:bg-slate-900/40',  border: 'border-border  dark:border-slate-700'  },
};

// ─── Status overrides ─────────────────────────────────────────────────────────

function getStatusDateCircle(status: string, cfg: typeof DAY_TYPE_CONFIG[string] | null) {
  if (status === 'completed') return 'bg-emerald-500 text-white';
  if (status === 'missed')    return 'bg-red-400 text-white';
  if (status === 'frozen')    return 'bg-sky-400 text-white';
  return cfg?.dateBg ?? 'bg-muted text-foreground';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  referenceDate: Date;
  days:          WorkoutDay[];
  onDayClick?:   (date: string) => void;
}

export default function WeekView({ referenceDate, days, onDayClick }: WeekViewProps) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayMap: Record<string, WorkoutDay> = {};
  days.forEach((d) => { if (d.date) dayMap[d.date] = d; });

  return (
    <div className="flex gap-1.5">
      {weekDays.map((date) => {
        const dateStr      = format(date, 'yyyy-MM-dd');
        const day          = dayMap[dateStr];
        const status       = day?.status ?? null;
        const dayType      = day?.dayType ?? null;
        const today        = isToday(date);
        const isPast       = isBefore(startOfDay(date), startOfDay(new Date()));
        const cfg          = dayType ? DAY_TYPE_CONFIG[dayType] : null;
        const isInteractive = !!day;

        const statusEmoji =
          status === 'missed'    ? '❌'
        : status === 'frozen'    ? '❄️'
        : status === 'completed' ? '✅'
        : cfg?.emoji ?? null;

        const circleClass = status
          ? getStatusDateCircle(status, cfg)
          : 'bg-muted/60 text-muted-foreground';

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => isInteractive && onDayClick?.(dateStr)}
            disabled={!isInteractive}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 px-0.5 rounded-xl border transition-all duration-150',
              // Card background
              isInteractive && cfg
                ? cn(cfg.cardBg, cfg.border)
                : 'border-transparent bg-transparent',
              // Interactive
              isInteractive
                ? 'hover:shadow-md hover:scale-[1.03] cursor-pointer active:scale-100'
                : 'cursor-default opacity-35',
              // Today highlight — ring on top of everything
              today && 'ring-2 ring-primary ring-offset-1',
              // Past planned days — subtle dimming
              !today && isPast && status === 'planned' && 'opacity-70',
            )}
          >
            {/* Day abbreviation */}
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider leading-none',
              today ? 'text-primary' : 'text-muted-foreground',
            )}>
              {format(date, 'EEE')}
            </span>

            {/* Date circle */}
            <span className={cn(
              'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold leading-none flex-shrink-0',
              circleClass,
              today && status !== 'completed' && status !== 'missed' && 'ring-2 ring-primary ring-offset-1',
            )}>
              {format(date, 'd')}
            </span>

            {/* Emoji */}
            <span className="text-base leading-none select-none min-h-[20px] flex items-center">
              {statusEmoji ?? ''}
            </span>

            {/* Short label */}
            {cfg && (
              <span className={cn(
                'text-[8px] font-semibold leading-none truncate w-full text-center',
                status === 'completed' ? 'text-emerald-600 dark:text-emerald-400'
                : status === 'missed'  ? 'text-red-500 dark:text-red-400'
                : status === 'frozen'  ? 'text-sky-500 dark:text-sky-400'
                : 'text-muted-foreground',
              )}>
                {cfg.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
