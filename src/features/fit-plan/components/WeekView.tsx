import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorkoutDay } from '@/api/generated/schemas';

const STATUS_BG: Record<string, string> = {
  completed: 'bg-green-500',
  missed:    'bg-red-400',
  planned:   'bg-blue-400',
  rest:      'bg-muted',
  frozen:    'bg-blue-200',
};

const DAY_TYPE_ICON: Record<string, string> = {
  chest:      '💪',
  legs:       '🦵',
  back:       '🏋️',
  full_body:  '🔥',
  cardio:     '🏃',
  arms:       '💪',
  rest:       '😴',
};

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
        const dateStr = format(date, 'yyyy-MM-dd');
        const day     = dayMap[dateStr];
        const status  = day?.status ?? 'none';
        const today   = isToday(date);

        return (
          <button
            key={dateStr}
            onClick={() => day && onDayClick?.(dateStr)}
            disabled={!day}
            className={cn(
              'flex-1 flex flex-col items-center py-2 rounded-lg text-xs transition-all',
              'focus-visible:outline-none focus-visible:ring-2',
              day ? 'hover:bg-accent cursor-pointer' : 'cursor-default',
              today && 'ring-2 ring-primary',
            )}
          >
            {/* Day name */}
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {format(date, 'EEE')}
            </span>

            {/* Date number */}
            <span className={cn(
              'mt-1 w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold',
              status in STATUS_BG ? STATUS_BG[status] : '',
              status === 'completed' || status === 'missed' ? 'text-white' : 'text-foreground',
            )}>
              {format(date, 'd')}
            </span>

            {/* Day type icon */}
            {day?.dayType && (
              <span className="mt-1 text-base leading-none">
                {DAY_TYPE_ICON[day.dayType] ?? '🏋️'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
