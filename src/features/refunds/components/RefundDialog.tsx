import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/lib/utils';
import { CURRENCY } from '@/config/tenant.config';
import { useQueryClient } from '@tanstack/react-query';
import { usePostRefunds, getGetRefundsQueryKey } from '@/api/generated/refunds/refunds';
import { getGetPaymentsQueryKey } from '@/api/generated/payments/payments';
import {
  getGetInvoicesInvoiceIdQueryKey,
  getGetInvoicesQueryKey,
} from '@/api/generated/invoices/invoices';
import { getGetBillingRecentTransactionsQueryKey } from '@/api/generated/billing/billing';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Enter a valid amount' })
    .min(0.01, 'Amount must be greater than 0'),
  type: z.enum(['cash', 'store_credit'] as const),
  reason: z.string().min(1, 'Reason is required').max(500),
  cancelSubscription: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentAmount: number;
  alreadyRefunded: number;
  currency?: string;
  subscriptionId?: string;   // pass if this payment is linked to a subscription
  invoiceId?: string;        // used to invalidate invoice-specific queries
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RefundDialog({
  open,
  onOpenChange,
  paymentId,
  paymentAmount,
  alreadyRefunded,
  currency = CURRENCY,
  subscriptionId,
  invoiceId,
  onSuccess,
}: RefundDialogProps) {
  const qc = useQueryClient();
  const maxRefundable = Math.max(0, paymentAmount - alreadyRefunded);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: maxRefundable,
      type: 'cash',
      reason: '',
      cancelSubscription: false,
    },
  });

  const [typeValue, setTypeValue] = useState<'cash' | 'store_credit'>('cash');
  const cancelSub = watch('cancelSubscription');

  const mutation = usePostRefunds({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Refund request submitted', description: 'Awaiting approval.' });
        void qc.invalidateQueries({ queryKey: getGetRefundsQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetBillingRecentTransactionsQueryKey() });
        if (invoiceId) {
          void qc.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
        }
        onSuccess?.();
        reset();
        onOpenChange(false);
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Failed to submit refund', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: FormValues) {
    if (values.amount > maxRefundable + 0.001) {
      toast({
        variant: 'destructive',
        title: 'Amount exceeds refundable balance',
        description: `Maximum refundable: ${formatCurrency(maxRefundable, currency)}`,
      });
      return;
    }

    mutation.mutate({
      data: {
        paymentId,
        amount: values.amount,
        type: values.type,
        reason: values.reason,
        cancelSubscription: values.cancelSubscription,
        ...(values.cancelSubscription && subscriptionId ? { subscriptionId } : {}),
      },
    });
  }

  function handleOpenChange(o: boolean) {
    if (!o && !mutation.isPending) {
      reset();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Submit a refund request for this payment. An owner must approve before funds are returned.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* ── Payment info ────────────────────────────────────────────── */}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original payment</span>
              <span className="font-medium">{formatCurrency(paymentAmount, currency)}</span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already refunded</span>
                <span className="text-orange-600 font-medium">
                  −{formatCurrency(alreadyRefunded, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t mt-1 pt-1">
              <span className="text-muted-foreground">Max refundable</span>
              <span className="font-semibold">{formatCurrency(maxRefundable, currency)}</span>
            </div>
          </div>

          {/* ── Amount ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Refund Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefundable}
              {...register('amount')}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* ── Type ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Refund Type *</Label>
            <Select
              value={typeValue}
              onValueChange={(v) => {
                setTypeValue(v as 'cash' | 'store_credit');
                setValue('type', v as 'cash' | 'store_credit');
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash — return money directly</SelectItem>
                <SelectItem value="store_credit">Store Credit — add to member wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Reason ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="e.g. duplicate charge, member leaving, incorrect amount…"
              rows={2}
              maxLength={500}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* ── Cancel subscription ──────────────────────────────────────── */}
          {subscriptionId && (
            <div className="flex items-start gap-2.5 rounded-md border px-3 py-2.5">
              <Checkbox
                id="cancelSubscription"
                checked={cancelSub}
                onCheckedChange={(v) => setValue('cancelSubscription', !!v)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="cancelSubscription" className="cursor-pointer text-sm">
                  Also cancel the linked subscription
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The subscription will be cancelled when this refund is approved.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || maxRefundable <= 0}>
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
