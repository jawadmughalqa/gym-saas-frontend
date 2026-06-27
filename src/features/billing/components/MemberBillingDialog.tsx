/**
 * MemberBillingDialog
 *
 * Opens a slide-over / dialog for a specific member showing:
 *  • Total outstanding amount
 *  • List of unpaid invoices (issued, partially_paid, overdue)
 *  • Per-invoice "Collect" button → inline payment form
 *  • Payment history
 *  • "New Invoice" shortcut
 */

import { useState } from 'react';
import { FilePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { StatusBadge } from './StatusBadge';
import { OutstandingFeesList } from './OutstandingFeesList';
import { CollectPaymentForm } from './CollectPaymentForm';
import { PaymentHistoryList } from './PaymentHistoryList';
import InvoiceForm from './InvoiceForm';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutstandingInvoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  currency: string;
  dueDate?: string;
  lineItems?: { description?: string }[];
}

interface MemberBillingDialogProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  branchId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── MemberBillingDialog ──────────────────────────────────────────────────────

export function MemberBillingDialog({
  memberId,
  memberName,
  memberEmail,
  branchId,
  open,
  onOpenChange,
}: MemberBillingDialogProps) {
  const { can } = usePermission();
  const { currency } = useTenantCurrency();

  // Track which invoice the payment form is open for
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  // ── Fetch outstanding invoices ─────────────────────────────────────────────
  const { data: invoicesData, isLoading: invoicesLoading, refetch } = useGetInvoices(
    { memberId, limit: 50 },
    { query: { enabled: !!memberId && open, staleTime: 5000 } },
  );

  const allInvoices = (invoicesData as any)?.data ?? [];

  const outstandingInvoices: OutstandingInvoice[] = allInvoices.filter(
    (inv: OutstandingInvoice) =>
      inv.status === 'issued' ||
      inv.status === 'partially_paid' ||
      inv.status === 'overdue',
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.amountDue || 0),
    0,
  );

  const activeInvoice = outstandingInvoices.find((inv) => inv._id === activeInvoiceId) ?? null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCollect(invoiceId: string) {
    setActiveInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  }

  function handlePaymentSuccess() {
    setActiveInvoiceId(null);
    refetch();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh]">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <DialogHeader className="px-5 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base">{memberName}</DialogTitle>
                {memberEmail && (
                  <DialogDescription className="text-xs mt-0.5">
                    {memberEmail}
                  </DialogDescription>
                )}
              </div>
              {can('invoice.create') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNewInvoiceOpen(true)}
                >
                  <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                  New Invoice
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-5">
              {invoicesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  {/* ── Total outstanding ─────────────────────────────────── */}
                  <div
                    className={cn(
                      'rounded-lg p-3 border',
                      totalOutstanding > 0
                        ? 'bg-red-500/10 border-red-100'
                        : 'bg-emerald-500/10 border-emerald-100',
                    )}
                  >
                    <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
                    <p
                      className={cn(
                        'text-xl font-bold',
                        totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600',
                      )}
                    >
                      {formatCurrency(totalOutstanding, currency)}
                    </p>
                    {outstandingInvoices.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Across {outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* ── Outstanding invoices list ──────────────────────────── */}
                  <OutstandingFeesList
                    invoices={outstandingInvoices}
                    activeInvoiceId={activeInvoiceId}
                    onCollect={handleCollect}
                  />

                  {/* ── Inline payment form ────────────────────────────────── */}
                  {activeInvoice && (
                    <>
                      <Separator />
                      <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Collecting for
                            </p>
                            <p className="text-sm font-mono font-medium">{activeInvoice.invoiceNumber}</p>
                          </div>
                          <StatusBadge status={activeInvoice.status} />
                        </div>
                        <CollectPaymentForm
                          invoiceId={activeInvoice._id}
                          amountDue={activeInvoice.amountDue}
                          currency={activeInvoice.currency || currency}
                          onSuccess={handlePaymentSuccess}
                        />
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* ── Payment history ────────────────────────────────────── */}
                  <PaymentHistoryList memberId={memberId} />
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New Invoice form — pre-fills memberId + branchId */}
      <InvoiceForm
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        defaultMemberId={memberId}
        defaultBranchId={branchId}
      />
    </>
  );
}
