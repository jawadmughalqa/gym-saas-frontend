import { useState } from 'react';
import { X, DollarSign, Receipt, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/utils/format';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { CURRENCY } from '@/config/tenant.config';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MemberBillingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
}

export function MemberBillingPopup({ open, onOpenChange, memberId, memberName }: MemberBillingPopupProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoicesResponse, isLoading } = useGetInvoices({ memberId, limit: 50 });
  const invoices = (invoicesResponse as any)?.data ?? [];

  const pendingTotal = invoices
    .filter((inv: any) => inv.status !== 'paid' && inv.status !== 'void')
    .reduce((sum: number, inv: any) => sum + (inv.amountDue || 0), 0);

  const outstandingFees = invoices.filter(
    (inv: any) => inv.status !== 'paid' && inv.status !== 'void'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Billing Details</span>
            <span className="text-sm font-normal text-muted-foreground">{memberName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Total Pending Amount */}
        <div className="p-4 text-center rounded-lg bg-orange-50 dark:bg-orange-950/20">
          <p className="text-sm text-muted-foreground">Total Pending Amount</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingTotal, CURRENCY)}</p>
        </div>

        {/* Outstanding Fees List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Outstanding Fees
          </h3>
          {isLoading ? (
            <Skeleton className="w-full h-20" />
          ) : outstandingFees.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No outstanding fees</p>
          ) : (
            outstandingFees.map((invoice: any) => (
              <div
                key={invoice._id}
                className="p-3 transition-colors border rounded-lg cursor-pointer hover:bg-muted/30"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{invoice.lineItems?.[0]?.description || 'Invoice'}</p>
                    <p className="font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{formatCurrency(invoice.amountDue, invoice.currency)}</p>
                    <Badge variant={invoice.status === 'overdue' ? 'destructive' : 'warning'}>
                      {invoice.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Collect Payment Button */}
        {pendingTotal > 0 && (
          <Button className="w-full" onClick={() => setShowPaymentForm(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Collect Payment
          </Button>
        )}

        {/* Simple Payment Form (simplified) */}
        {showPaymentForm && selectedInvoice && (
          <div className="pt-4 mt-2 border-t">
            <h4 className="mb-3 text-sm font-medium">Record Payment</h4>
            {/* Payment form fields would go here */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
              <Button size="sm">
                <DollarSign className="w-3 h-3 mr-1" />
                Record
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}