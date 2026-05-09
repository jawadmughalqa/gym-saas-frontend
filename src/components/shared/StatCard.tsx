import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Positive = green arrow up, negative = red arrow down, zero = dash */
  trend?: number;
  trendLabel?: string;
  className?: string;
}

/**
 * Dashboard metric card.
 *
 * Usage:
 *   <StatCard
 *     title="Active Members"
 *     value={412}
 *     icon={Users}
 *     trend={8.2}
 *     trendLabel="vs last month"
 *   />
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  trend,
  trendLabel,
  className,
}: StatCardProps) {
  const hasTrend = trend !== undefined;
  const trendPositive = (trend ?? 0) > 0;
  const trendNeutral = trend === 0;

  const TrendIcon = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trendNeutral
    ? 'text-muted-foreground'
    : trendPositive
    ? 'text-green-600'
    : 'text-red-500';

  return (
    <Card className={cn('hover:shadow-md transition-shadow duration-200', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground leading-snug">{title}</CardTitle>
        {Icon && (
          <div className={cn('rounded-lg p-2 bg-primary/10 text-primary shrink-0', iconClassName)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {(subtitle || hasTrend) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {hasTrend && (
              <span className={cn('flex items-center gap-0.5 font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend!).toFixed(1)}%
              </span>
            )}
            {trendLabel && <span>{trendLabel}</span>}
            {subtitle && !hasTrend && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
