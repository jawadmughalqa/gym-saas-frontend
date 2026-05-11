import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Eye, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useGetPayments } from '@/api/generated/payments/payments';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';

interface RecentTransaction {
  _id: string;
  memberName: string;
  memberId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  invoiceNumber: string;
  method: string;
  amount: number;
  currency: string;
  paidAt: string;
  status: string;
  reference?: string;
}

interface RecentTransactionsProps {
  limit?: number;
}

export function RecentTransactions({ limit = 10 }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: paymentsData, isLoading } = useGetPayments(
    { limit, sortBy: 'paidAt', sortOrder: 'desc' },
    { query: { staleTime: 1000 * 30, refetchOnWindowFocus: false } }
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/billing/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-24 h-3" />
            </div>
            <Skeleton className="w-16 h-6" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Receipt className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No recent transactions</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="p-2 space-y-1">
        {payments.map((payment: any) => (
          <div
            key={payment._id}
            className="relative group"
            onMouseEnter={() => setHoveredId(payment._id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex items-start gap-3 p-3 transition-colors rounded-lg hover:bg-muted/50">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center rounded-full h-9 w-9 bg-primary/10">
                  <span className="text-xs font-semibold text-primary">
                    {getInitials(payment.memberId?.firstName || '', payment.memberId?.lastName || '')}
                  </span>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {payment.memberId?.firstName} {payment.memberId?.lastName}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {getPaymentMethodLabel(payment.method)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {payment.invoiceId?.invoiceNumber || 'N/A'} • {formatDateTime(payment.paidAt)}
                </p>
                {payment.reference && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ref: {payment.reference}
                  </p>
                )}
              </div>

              {/* Amount & Status */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <StatusBadge status={payment.status} />
              </div>
            </div>

            {/* View Invoice Button - Appears on Hover */}
            {hoveredId === payment._id && payment.invoiceId && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute px-2 transition-opacity -translate-y-1/2 opacity-0 right-3 top-1/2 h-7 group-hover:opacity-100"
                onClick={() => handleViewInvoice(payment.invoiceId._id)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}