import { CheckCircle2, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';

interface OutstandingInvoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  currency: string;
  dueDate?: string;
  lineItems?: { description?: string }[];
}

interface OutstandingFeesListProps {
  invoices: OutstandingInvoice[];
  /** ID of the invoice currently open in the payment form */
  activeInvoiceId?: string | null;
  /** Called when the user clicks "Collect" on an invoice */
  onCollect?: (invoiceId: string) => void;
}

export function OutstandingFeesList({
  invoices,
  activeInvoiceId,
  onCollect,
}: OutstandingFeesListProps) {
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

      {invoices.map((invoice) => {
        const isActive = activeInvoiceId === invoice._id;
        const description = invoice.lineItems?.[0]?.description || 'Invoice';

        return (
          <div
            key={invoice._id}
            className={cn(
              'flex items-start justify-between p-3 border rounded-lg transition-colors',
              isActive ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/30',
            )}
          >
            {/* Left: invoice details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium truncate">{description}</p>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Due: {invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date'}
              </p>
            </div>

            {/* Right: amount + collect button */}
            <div className="ml-4 flex flex-col items-end gap-2 shrink-0">
              <p className="font-semibold text-red-600">
                {formatCurrency(invoice.amountDue, invoice.currency || 'PKR')}
              </p>
              {onCollect && (
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => onCollect(invoice._id)}
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  {isActive ? 'Cancel' : 'Collect'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
