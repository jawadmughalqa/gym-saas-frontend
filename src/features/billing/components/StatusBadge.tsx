import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  // Invoice statuses
  active:          { label: 'Active',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  paid:            { label: 'Paid',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  pending:         { label: 'Pending',       className: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
  overdue:         { label: 'Overdue',       className: 'bg-red-50 text-red-700 border-red-200',             icon: AlertCircle },
  partially_paid:  { label: 'Partial',       className: 'bg-orange-50 text-orange-700 border-orange-200',   icon: Clock },
  void:            { label: 'Void',          className: 'bg-gray-50 text-gray-700 border-gray-200',          icon: XCircle },
  draft:           { label: 'Draft',         className: 'bg-gray-50 text-gray-700 border-gray-200',          icon: Clock },
  issued:          { label: 'Issued',        className: 'bg-blue-50 text-blue-700 border-blue-200',          icon: CheckCircle },
  // Payment statuses — backend stores 'completed' not 'paid'
  completed:       { label: 'Paid',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  failed:          { label: 'Failed',        className: 'bg-red-50 text-red-700 border-red-200',             icon: XCircle },
  refunded:        { label: 'Refunded',      className: 'bg-gray-50 text-gray-500 border-gray-200',          icon: XCircle },
  partially_refunded: { label: 'Part. Refunded', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock },
  // Subscription statuses
  cancelled:       { label: 'Cancelled',     className: 'bg-gray-50 text-gray-500 border-gray-200',          icon: XCircle },
  frozen:          { label: 'Frozen',        className: 'bg-blue-50 text-blue-600 border-blue-200',          icon: Clock },
  expired:         { label: 'Expired',       className: 'bg-gray-50 text-gray-500 border-gray-200',          icon: XCircle },
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status ?? 'Unknown',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
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