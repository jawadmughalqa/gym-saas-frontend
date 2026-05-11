import { CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';

interface OutstandingFeesListProps {
  invoices: any[];
}

export function OutstandingFeesList({ invoices }: OutstandingFeesListProps) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <p className="text-sm font-medium">All fees paid</p>
        <p className="text-xs text-muted-foreground">No outstanding dues</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Outstanding Fees
      </p>

      {invoices.map((invoice) => (
        <div
          key={invoice._id}
          className="flex items-start justify-between p-3 transition-colors border rounded-lg cursor-pointer hover:bg-muted/30"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium truncate">
                {invoice.lineItems?.[0]?.description || 'Invoice'}
              </p>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Due: {invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date'}
            </p>
          </div>
          <div className="ml-4 text-right shrink-0">
            <p className="font-semibold text-red-600">{formatCurrency(invoice.amountDue, invoice.currency)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}