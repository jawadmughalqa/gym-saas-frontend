import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkoutDay } from '@/api/generated/schemas';

// ─── Status colour map ────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  completed: 'bg-green-500 text-white',
  missed:    'bg-red-400 text-white',
  planned:   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rest:      'bg-muted text-muted-foreground',
  frozen:    'bg-blue-200 text-blue-700 dark:bg-blue-800/50',
};

// ─── Day-type short labels ────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  chest:      'CH',
  legs:       'LG',
  back:       'BK',
  full_body:  'FB',
  cardio:     'CA',
  arms:       'AR',
  rest:       '—',
};

interface CalendarViewProps {
  year:   number;
  month:  number; // 1-12
  days:   WorkoutDay[];
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
  const startOffset = getDay(monthStart); // 0=Sun

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty cells */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {allDays.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const day     = dayMap[dateStr];
          const status  = day?.status;
          const dayType = day?.dayType;
          const today   = isToday(date);

          return (
            <button
              key={dateStr}
              onClick={() => day && onDayClick?.(dateStr)}
              disabled={!day}
              className={cn(
                'relative flex flex-col items-center justify-center h-10 rounded-md text-xs font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2',
                day
                  ? 'hover:ring-2 hover:ring-primary/30 cursor-pointer'
                  : 'cursor-default',
                status ? STATUS_CLASSES[status] : 'text-foreground hover:bg-accent',
                today && !status && 'ring-2 ring-primary',
              )}
            >
              <span className="leading-none">{format(date, 'd')}</span>
              {dayType && (
                <span className="text-[9px] leading-none opacity-80 mt-0.5">
                  {DAY_LABELS[dayType] ?? dayType.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {Object.entries(STATUS_CLASSES).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('w-3 h-3 rounded-sm inline-block', cls)} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
