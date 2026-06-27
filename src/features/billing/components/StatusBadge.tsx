import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  // Invoice statuses
  active:          { label: 'Active',        className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle },
  paid:            { label: 'Paid',          className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle },
  pending:         { label: 'Pending',       className: 'bg-amber-500/10 text-amber-500 border-amber-500/25',       icon: Clock },
  overdue:         { label: 'Overdue',       className: 'bg-red-500/10 text-red-500 border-red-500/25',             icon: AlertCircle },
  partially_paid:  { label: 'Partial',       className: 'bg-orange-500/10 text-orange-500 border-orange-500/25',   icon: Clock },
  void:            { label: 'Void',          className: 'bg-muted/60 text-muted-foreground border-border',          icon: XCircle },
  draft:           { label: 'Draft',         className: 'bg-muted/60 text-muted-foreground border-border',          icon: Clock },
  issued:          { label: 'Issued',        className: 'bg-blue-500/10 text-blue-500 border-blue-500/25',          icon: CheckCircle },
  // Payment statuses — backend stores 'completed' not 'paid'
  completed:       { label: 'Paid',          className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25', icon: CheckCircle },
  failed:          { label: 'Failed',        className: 'bg-red-500/10 text-red-500 border-red-500/25',             icon: XCircle },
  refunded:        { label: 'Refunded',      className: 'bg-muted/60 text-muted-foreground border-border',          icon: XCircle },
  partially_refunded: { label: 'Part. Refunded', className: 'bg-orange-500/10 text-orange-500 border-orange-500/25', icon: Clock },
  // Subscription statuses
  cancelled:       { label: 'Cancelled',     className: 'bg-muted/60 text-muted-foreground border-border',          icon: XCircle },
  frozen:          { label: 'Frozen',        className: 'bg-blue-500/10 text-blue-600 border-blue-500/25',          icon: Clock },
  expired:         { label: 'Expired',       className: 'bg-muted/60 text-muted-foreground border-border',          icon: XCircle },
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status ?? 'Unknown',
    className: 'bg-muted/60 text-muted-foreground border-border',
    icon: Clock,
  };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('text-xs font-medium capitalize', config.className, className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}