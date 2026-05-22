import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types/billing.types';

export default function InvoiceSummary({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
          <p className="text-lg font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount Paid</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount Due</p>
          <p className={cn('text-lg font-bold', invoice.amountDue > 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {formatCurrency(invoice.amountDue, invoice.currency)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Discount</p>
          <p className="text-lg font-bold text-orange-600">
            {invoice.discountTotal > 0 ? `-${formatCurrency(invoice.discountTotal, invoice.currency)}` : '—'}
          </p>
          {invoice.discountCode && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{invoice.discountCode}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
