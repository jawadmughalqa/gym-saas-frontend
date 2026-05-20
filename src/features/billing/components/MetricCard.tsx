import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { CURRENCY, LOCALE } from '@/config/tenant.config';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  currency?: string;
}

const VARIANT_STYLES = {
  default: 'bg-muted/50',
  success: 'bg-emerald-50 border-emerald-100',
  warning: 'bg-amber-50 border-amber-100',
  danger: 'bg-red-50 border-red-100',
  info: 'bg-blue-50 border-blue-100',
};

const ICON_STYLES = {
  default: 'text-muted-foreground',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: MetricCardProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={cn('border', VARIANT_STYLES[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(value)}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
              VARIANT_STYLES[variant]
            )}
          >
            <Icon className={cn('h-4 w-4', ICON_STYLES[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}