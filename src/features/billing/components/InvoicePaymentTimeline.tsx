/**
 * InvoicePaymentTimeline
 *
 * Renders the per-invoice payment history timeline.
 * Shown when the user expands an invoice row in PaymentHistoryList.
 *
 * - Displays what the invoice was FOR (line items)
 * - Shows each partial/full payment with date, amount, method, status
 * - Shows a progress bar: paid vs. remaining
 * - "Fully settled" green banner when amountDue = 0
 */
import { useState } from 'react';
import { Receipt, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useInvoicePayments, INVOICE_PAYMENTS_KEY } from '../hooks/use-invoice-payments';
import { StatusBadge } from './StatusBadge';
import { CURRENCY } from '@/config/tenant.config';
import { usePermission } from '@/hooks/use-permission';
import { RefundDialog } from '@/features/refunds/components/RefundDialog';
import { useQueryClient } from '@tanstack/react-query';

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvoicePaymentTimelineProps {
  invoiceId: string;
  currency?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  online: 'Online',
  other: 'Other',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePaymentTimeline({ invoiceId, currency = CURRENCY }: InvoicePaymentTimelineProps) {
  const { can } = usePermission();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useInvoicePayments(invoiceId);

  const [refundTarget, setRefundTarget] = useState<{
    paymentId: string;
    amount: number;
    totalRefunded: number;
    currency: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2 py-3 px-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-destructive py-3 px-4">
        Could not load payment history.
      </p>
    );
  }

  const { invoice, payments } = data;
  const curr = invoice.currency || currency;
  const paidPct = invoice.total > 0 ? Math.min(100, (invoice.amountPaid / invoice.total) * 100) : 0;
  const isSettled = invoice.amountDue <= 0.01;

  return (
    <>
    <div className="bg-muted/30 border-t px-4 py-3 space-y-4">
      {/* ── What was this invoice for? ───────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Invoice contents
        </p>
        <div className="space-y-1">
          {invoice.lineItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-foreground">
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                {item.description}
                {item.quantity > 1 && (
                  <span className="text-muted-foreground">× {item.quantity}</span>
                )}
              </span>
              <span className="font-mono text-muted-foreground">
                {formatCurrency(item.total, curr)}
              </span>
            </div>
          ))}
          {invoice.lineItems.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No line items</p>
          )}
        </div>
      </div>

      {/* ── Payment progress bar ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">
            Paid {formatCurrency(invoice.amountPaid, curr)} of {formatCurrency(invoice.total, curr)}
          </span>
          {isSettled ? (
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Fully settled
            </span>
          ) : (
            <span className="text-orange-600 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatCurrency(invoice.amountDue, curr)} remaining
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isSettled ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      {/* ── Payment timeline ─────────────────────────────────────────────── */}
      {payments.length === 0 ? (
        <div className="flex items-center gap-2 py-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No payments recorded yet</p>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Payment history ({payments.length})
          </p>
          <div className="relative space-y-0">
            {payments.map((payment, index) => {
              const isLast = index === payments.length - 1;
              return (
                <div key={payment._id} className="flex gap-2.5">
                  {/* Spine */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`mt-3 h-2 w-2 rounded-full border-2 shrink-0 ${
                        payment.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500'
                          : payment.status === 'refunded' || payment.status === 'partially_refunded'
                            ? 'bg-gray-400 border-gray-400'
                            : payment.status === 'failed'
                              ? 'bg-red-400 border-red-400'
                              : 'bg-amber-400 border-amber-400'
                      }`}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[1.25rem]" />
                    )}
                  </div>

                  {/* Entry */}
                  <div className="flex-1 min-w-0 pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Amount + method + status */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">
                            {formatCurrency(payment.amount, payment.currency || curr)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            via {METHOD_LABELS[payment.method] ?? payment.method}
                          </span>
                          <StatusBadge status={payment.status} />
                        </div>
                        {/* Timestamp */}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(payment.paidAt)}
                        </p>
                        {/* Reference */}
                        {payment.reference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {payment.reference}
                          </p>
                        )}
                        {/* Notes */}
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            {payment.notes}
                          </p>
                        )}
                        {/* Refund info */}
                        {(payment.totalRefunded ?? 0) > 0 && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            Refunded: {formatCurrency(payment.totalRefunded!, payment.currency || curr)}
                            {payment.status !== 'refunded' && payment.netAmount != null && (
                              <span className="text-muted-foreground">
                                {' '}· Net: {formatCurrency(payment.netAmount, payment.currency || curr)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Refund button — only for completed/partially-refunded payments */}
                      {can('payment.refund') &&
                        (payment.status === 'completed' || payment.status === 'partially_refunded') &&
                        payment.amount - (payment.totalRefunded ?? 0) > 0.01 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() =>
                              setRefundTarget({
                                paymentId: payment._id,
                                amount: payment.amount,
                                totalRefunded: payment.totalRefunded ?? 0,
                                currency: payment.currency || curr,
                              })
                            }
                          >
                            Refund
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* ── Refund dialog ──────────────────────────────────────────────── */}
      {refundTarget && (
        <RefundDialog
          open={!!refundTarget}
          onOpenChange={(o) => { if (!o) setRefundTarget(null); }}
          paymentId={refundTarget.paymentId}
          paymentAmount={refundTarget.amount}
          alreadyRefunded={refundTarget.totalRefunded}
          currency={refundTarget.currency}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: INVOICE_PAYMENTS_KEY(invoiceId) });
          }}
        />
      )}
    </>
  );
}
