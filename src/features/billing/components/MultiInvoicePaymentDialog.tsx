/**
 * MultiInvoicePaymentDialog
 *
 * Handles payment across multiple selected invoices in a single flow.
 * The user picks a method + enters total amount. The system distributes
 * the payment oldest-first (FIFO): each invoice is paid in full or partially,
 * until the entered amount is exhausted.
 */

import { useState, useMemo } from 'react';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CURRENCY } from '@/config/tenant.config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { usePostPayments } from '@/api/generated/payments/payments';
import { getGetInvoicesQueryKey } from '@/api/generated/invoices/invoices';
import { getGetPaymentsQueryKey } from '@/api/generated/payments/payments';
import { toast } from '@/hooks/use-toast';
import type { OutstandingInvoice } from './OutstandingFeesList';

function invalidatePayments(qc: ReturnType<typeof useQueryClient>) {
  try {
    qc.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
  } catch {
    qc.invalidateQueries({ queryKey: ['payments'] });
  }
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'online' | 'other';

interface AllocationRow {
  invoice: OutstandingInvoice;
  allocated: number;
  remaining: number;
  fullyPaid: boolean;
}

interface MultiInvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: OutstandingInvoice[];
  currency?: string;
  onSuccess: () => void;
}

export function MultiInvoicePaymentDialog({
  open,
  onOpenChange,
  invoices,
  currency = CURRENCY,
  onSuccess,
}: MultiInvoicePaymentDialogProps) {
  const queryClient = useQueryClient();

  const totalDue = invoices.reduce((s, inv) => s + inv.amountDue, 0);

  const [amount, setAmount] = useState<string>(String(totalDue.toFixed(2)));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { mutateAsync: postPayment } = usePostPayments({});

  const numericAmount = parseFloat(amount) || 0;
  const needsReference = method === 'bank_transfer' || method === 'online';

  // ── FIFO allocation preview ───────────────────────────────────────────────
  const allocation: AllocationRow[] = useMemo(() => {
    let remaining = numericAmount;
    return invoices.map((inv) => {
      const allocated = Math.min(remaining, inv.amountDue);
      remaining = Math.max(0, remaining - allocated);
      return {
        invoice: inv,
        allocated: Math.round(allocated * 100) / 100,
        remaining: Math.round((inv.amountDue - allocated) * 100) / 100,
        fullyPaid: allocated >= inv.amountDue - 0.01,
      };
    });
  }, [invoices, numericAmount]);

  const invoicesPaidInFull = allocation.filter((r) => r.fullyPaid).length;
  const invoicesPartial = allocation.filter((r) => !r.fullyPaid && r.allocated > 0).length;

  async function handleSubmit() {
    if (numericAmount <= 0) return;

    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of allocation) {
      if (row.allocated <= 0) continue;
      try {
        await postPayment({
          data: {
            invoiceId: row.invoice._id,
            amount: row.allocated,
            method,
            reference: reference || undefined,
          },
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    await queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
    invalidatePayments(queryClient);

    setSubmitting(false);

    if (failCount === 0) {
      toast({ title: `Payment recorded across ${successCount} invoice${successCount !== 1 ? 's' : ''}` });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        variant: 'destructive',
        title: `${successCount} payments recorded, ${failCount} failed`,
        description: 'Check outstanding fees for any remaining balances.',
      });
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Selected Invoices</DialogTitle>
          <DialogDescription>
            Paying {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · Total due:{' '}
            <span className="font-semibold text-foreground">{formatCurrency(totalDue, currency)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {currency}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                className="pl-12 font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {numericAmount < totalDue && numericAmount > 0 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Partial payment — {formatCurrency(totalDue - numericAmount, currency)} will remain outstanding
              </p>
            )}
          </div>

          {/* Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsReference && (
            <div className="space-y-1.5">
              <Label>Reference / Transaction ID</Label>
              <Input
                placeholder="Enter reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <Separator />

          {/* Allocation preview */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payment Allocation (oldest first)
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allocation.map((row) => (
                <div
                  key={row.invoice._id}
                  className="flex items-center justify-between text-xs p-2 rounded-md border"
                >
                  <div className="min-w-0">
                    <p className="font-mono truncate">{row.invoice.invoiceNumber}</p>
                    <p className="text-muted-foreground mt-0.5">
                      Due: {formatCurrency(row.invoice.amountDue, currency)}
                    </p>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    {row.allocated > 0 ? (
                      <>
                        <p className="font-semibold text-emerald-600">
                          −{formatCurrency(row.allocated, currency)}
                        </p>
                        {row.fullyPaid ? (
                          <p className="text-emerald-600 text-[10px]">Fully settled ✓</p>
                        ) : (
                          <p className="text-orange-600 text-[10px]">
                            {formatCurrency(row.remaining, currency)} left
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic text-[10px]">No payment applied</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {numericAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                {invoicesPaidInFull > 0 && `${invoicesPaidInFull} fully settled`}
                {invoicesPaidInFull > 0 && invoicesPartial > 0 && ' · '}
                {invoicesPartial > 0 && `${invoicesPartial} partially paid`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={submitting || numericAmount <= 0}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1.5" />
              )}
              Confirm Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
