/**
 * PaymentHistoryList
 *
 * Shows ALL payments made by a member, grouped by invoice.
 * Each invoice row is expandable — clicking it reveals InvoicePaymentTimeline
 * which shows WHEN each partial/full payment was made for that invoice.
 *
 * Grouped view:
 *   📄 INV-001 · Membership Fee  → PKR 5,000 · Paid   [↓ expand]
 *      └─ Timeline: 3,000 on Jan 5  + 2,000 on Jan 10 → Fully settled
 *
 *   📄 INV-002 · Water Charges   → PKR 500 · Partial  [↓ expand]
 *      └─ Timeline: 200 on Feb 1  → PKR 300 remaining
 */
import { useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, FileText, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { CURRENCY } from '@/config/tenant.config';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from './StatusBadge';
import { InvoicePaymentTimeline } from './InvoicePaymentTimeline';
import { INVOICE_PAYMENTS_KEY } from '../hooks/useInvoicePayments';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentHistoryListProps {
  memberId: string;
  /** Called by parent so it can invalidate/refetch if needed */
  onRefetch?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentHistoryList({ memberId }: PaymentHistoryListProps) {
  const queryClient = useQueryClient();
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Fetch all invoices for this member (all statuses) so we can show history
  const { data: invoicesData, isLoading } = useGetInvoices(
    { memberId, limit: 100 },
    { query: { staleTime: 1000 * 30, enabled: !!memberId } },
  );

  const allInvoices = ((invoicesData as any)?.data ?? []) as any[];

  // Show invoices that have at least some payment activity (including refunded)
  const paidInvoices = allInvoices.filter(
    (inv: any) =>
      inv.status === 'paid' ||
      inv.status === 'partially_paid' ||
      inv.status === 'refunded' ||
      inv.amountPaid > 0,
  );

  // ── Expand / collapse ─────────────────────────────────────────────────────

  function handleToggle(invoiceId: string) {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
    } else {
      setExpandedInvoiceId(invoiceId);
      // Prefetch / invalidate timeline so it's fresh when expanded
      queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENTS_KEY(invoiceId) });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Payment History
        {paidInvoices.length > 0 && (
          <span className="ml-1 font-normal text-muted-foreground/60">
            ({paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''})
          </span>
        )}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="w-full h-14" />
          ))}
        </div>
      ) : paidInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No payment history</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {paidInvoices.map((inv: any) => {
            const isExpanded = expandedInvoiceId === inv._id;
            const currency = inv.currency || CURRENCY;
            const isSettled = inv.amountDue <= 0.01;

            // Summarise the invoice: first line item or invoice number
            const firstItem = inv.lineItems?.[0];
            const itemLabel =
              inv.lineItems?.length === 1
                ? firstItem?.description
                : inv.lineItems?.length > 1
                  ? `${firstItem?.description} +${inv.lineItems.length - 1} more`
                  : inv.invoiceNumber;

            return (
              <div
                key={inv._id}
                className={cn(
                  'rounded-lg border overflow-hidden',
                  isExpanded ? 'border-primary/30 bg-background' : 'bg-background',
                )}
              >
                {/* ── Invoice row (clickable header) ────────────────────── */}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  onClick={() => handleToggle(inv._id)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {inv.invoiceNumber}
                      </span>
                      {itemLabel && (
                        <span className="text-xs text-foreground truncate">
                          · {itemLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-sm font-semibold">
                        {formatCurrency(inv.amountPaid, currency)}
                      </span>
                      {!isSettled && inv.amountDue > 0 && inv.status !== 'refunded' && (
                        <span className="text-xs text-muted-foreground">
                          of {formatCurrency(inv.total, currency)}
                        </span>
                      )}
                      {(inv.discountTotal ?? 0) > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">
                          −{formatCurrency(inv.discountTotal, currency)} discount
                        </span>
                      )}
                      {inv.status === 'refunded' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <RotateCcw className="h-3 w-3" />
                          Refunded
                        </span>
                      )}
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>

                  <span className="text-muted-foreground shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {/* ── Expandable timeline ───────────────────────────────── */}
                {isExpanded && (
                  <InvoicePaymentTimeline invoiceId={inv._id} currency={currency} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
