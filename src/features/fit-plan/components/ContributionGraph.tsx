import { useMemo } from 'react';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FitPlanStatsContributionDaysItem } from '@/api/generated/schemas';

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-green-500',
  missed:    'bg-red-300',
  planned:   'bg-blue-200 dark:bg-blue-800',
  rest:      'bg-muted-foreground/20',
  frozen:    'bg-blue-300',
};

interface ContributionGraphProps {
  days:  FitPlanStatsContributionDaysItem[];
  weeks?: number;
}

export default function ContributionGraph({ days, weeks = 13 }: ContributionGraphProps) {
  const today    = new Date();
  const daysBack = weeks * 7 - 1;
  const start    = subDays(today, daysBack);

  const dayMap = useMemo(() => {
    const m: Record<string, FitPlanStatsContributionDaysItem> = {};
    days.forEach((d) => { if (d.date) m[d.date] = d; });
    return m;
  }, [days]);

  const allDates = eachDayOfInterval({ start, end: today });

  // Pad front so first column starts on Sunday
  const firstDay = allDates[0];
  const leadingBlanks = (firstDay.getDay()) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...allDates,
  ];

  // Chunk into columns of 7 (each column = one week)
  const columns: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-0.5 min-w-max">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-0.5">
              {col.map((date, ri) => {
                if (!date) return <div key={ri} className="w-3 h-3" />;
                const dateStr = format(date, 'yyyy-MM-dd');
                const day     = dayMap[dateStr];
                const status  = day?.status ?? 'none';
                const color   = STATUS_COLOR[status] ?? 'bg-muted/40';

                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80',
                          color,
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span className="font-medium">{format(date, 'MMM d')}</span>
                      {day?.dayType && (
                        <span className="ml-1 capitalize text-muted-foreground">
                          — {day.dayType.replace('_', ' ')}
                        </span>
                      )}
                      <span className="ml-1 capitalize">({status})</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
