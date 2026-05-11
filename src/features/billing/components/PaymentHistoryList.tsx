import { Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useGetPayments } from '@/api/generated/payments/payments';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';

interface PaymentHistoryListProps {
  memberId: string;
  onViewReceipt?: (transactionCode: string) => void;
}

export function PaymentHistoryList({ memberId, onViewReceipt }: PaymentHistoryListProps) {
  const { data: paymentsData, isLoading } = useGetPayments(
    { memberId, limit: 20 },
    { query: { enabled: !!memberId, staleTime: 1000 * 30 } }
  );

  const payments = paymentsData?.data ?? [];

  const getPaymentMethodLabel = (method: string): string => {
    const methods: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      online: 'Online',
      other: 'Other',
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Payment History
        </p>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-full h-16" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Payment History
        </p>
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No payment history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Payment History ({payments.length})
      </p>

      <div className="space-y-2">
        {payments.map((payment: any) => (
          <div
            key={payment._id}
            className="flex items-center justify-between p-3 transition-colors border rounded-lg hover:bg-muted/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(payment.method)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(payment.paidAt)}
              </p>
              {payment.reference && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ref: {payment.reference}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={payment.status} />
              {onViewReceipt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 h-7"
                  onClick={() => onViewReceipt(payment.transactionCode || payment._id)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}