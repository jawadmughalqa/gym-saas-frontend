import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/lib/utils';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostRefundsRefundIdApprove,
  usePostRefundsRefundIdReject,
  getGetRefundsQueryKey,
} from '@/api/generated/refunds/refunds';
import type { Refund } from '@/api/generated/refunds/refunds';
import { getGetInvoicesQueryKey } from '@/api/generated/invoices/invoices';
import { getGetPaymentsQueryKey } from '@/api/generated/payments/payments';
import { getGetBillingRecentTransactionsQueryKey, getGetBillingDashboardQueryKey } from '@/api/generated/billing/billing';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReviewRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: Refund | null;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewRefundDialog({
  open,
  onOpenChange,
  refund,
  onSuccess,
}: ReviewRefundDialogProps) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  // Keep a stable copy so the dialog can animate closed even when refund becomes null
  const stableRefund = useRef(refund);
  useEffect(() => { if (refund) stableRefund.current = refund; }, [refund]);
  const displayRefund = refund ?? stableRefund.current;

  function invalidate() {
    void qc.invalidateQueries({ queryKey: getGetRefundsQueryKey() });
  }

  function invalidateAfterApproval() {
    invalidate();
    // Approving a refund changes both the payment (status, totalRefunded, netAmount)
    // and the invoice (amountPaid, amountDue, status). Invalidate both so any
    // open InvoiceDetailPage or BillingTab shows the correct figures immediately.
    void qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetBillingRecentTransactionsQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetBillingDashboardQueryKey() });
  }

  // Close unconditionally — used from onSuccess where isPending is still true
  function closeDialog() {
    setNote('');
    setAction(null);
    onOpenChange(false);
  }

  const approve = usePostRefundsRefundIdApprove({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Refund approved', description: 'Refund has been executed.' });
        invalidateAfterApproval();
        onSuccess?.();
        closeDialog();
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Failed to approve', description: getErrorMessage(err) }),
    },
  });

  const reject = usePostRefundsRefundIdReject({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Refund rejected' });
        invalidate();
        onSuccess?.();
        closeDialog();
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Failed to reject', description: getErrorMessage(err) }),
    },
  });

  const isPending = approve.isPending || reject.isPending;

  // User-initiated close (Cancel button / backdrop) — blocked while request is in-flight
  function handleClose() {
    if (!isPending) closeDialog();
  }

  function handleApprove() {
    if (!refund?._id) return;
    setAction('approve');
    approve.mutate({ refundId: refund._id, data: { reviewNote: note || undefined } });
  }

  function handleReject() {
    if (!refund?._id) return;
    if (!note.trim()) {
      toast({ variant: 'destructive', title: 'Rejection reason required' });
      return;
    }
    setAction('reject');
    reject.mutate({ refundId: refund._id, data: { reviewNote: note } });
  }

  const { currency: tenantCurrency } = useTenantCurrency();
  if (!displayRefund) return null;

  const currency = (displayRefund.paymentId as any)?.currency ?? tenantCurrency;
  const memberName = displayRefund.memberId
    ? `${displayRefund.memberId.firstName ?? ''} ${displayRefund.memberId.lastName ?? ''}`.trim()
    : 'Unknown member';
  const requestedBy = displayRefund.requestedBy
    ? `${displayRefund.requestedBy.firstName ?? ''} ${displayRefund.requestedBy.lastName ?? ''}`.trim()
    : 'Unknown';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Refund Request</DialogTitle>
          <DialogDescription>
            Approve to execute the refund, or reject with a reason.
          </DialogDescription>
        </DialogHeader>

        {/* ── Refund summary ────────────────────────────────────────────── */}
        <div className="rounded-md bg-muted/50 px-3 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member</span>
            <span className="font-medium">{memberName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refund amount</span>
            <span className="font-semibold">{formatCurrency(displayRefund.amount ?? 0, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize">
              {displayRefund.type === 'store_credit' ? 'Store Credit (wallet)' : 'Cash'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Requested by</span>
            <span>{requestedBy}</span>
          </div>
          <div className="flex flex-col gap-0.5 border-t pt-1.5">
            <span className="text-muted-foreground">Reason</span>
            <span className="text-foreground">{displayRefund.reason}</span>
          </div>
          {displayRefund.cancelSubscription && (
            <p className="text-orange-600 text-xs font-medium pt-0.5">
              ⚠ Approving will also cancel the linked subscription.
            </p>
          )}
        </div>

        {/* ── Review note ───────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="reviewNote">
            Review Note
            {action === 'reject' && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id="reviewNote"
            placeholder={action === 'reject' ? 'Required: explain why this is rejected…' : 'Optional note for the record…'}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
          />
        </div>

        <DialogFooter className="gap-2 pt-1 flex-col sm:flex-row">
          <Button variant="outline" onClick={handleClose} disabled={isPending} className="sm:mr-auto">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            {reject.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending}
          >
            {approve.isPending ? 'Approving…' : 'Approve & Execute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
