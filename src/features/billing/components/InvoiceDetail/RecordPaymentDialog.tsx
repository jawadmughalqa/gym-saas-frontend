import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/format';
import {
  usePostPayments,
  getGetPaymentsQueryKey,
} from '@/api/generated/payments/payments';
import { getGetInvoicesInvoiceIdQueryKey } from '@/api/generated/invoices/invoices';

// ─── Schema ───────────────────────────────────────────────────────────────────

const paySchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type PayFormValues = z.infer<typeof paySchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  invoiceId: string;
  currency: string;
  amountDue: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function RecordPaymentDialog({ invoiceId, currency, amountDue, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const recordPayment = usePostPayments({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
        queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
        toast({ title: 'Payment recorded successfully' });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to record payment',
          description: err?.response?.data?.message || err?.message,
        });
      },
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: amountDue, method: 'cash' },
  });

  function onSubmit(values: PayFormValues) {
    recordPayment.mutate({
      data: {
        invoiceId,
        amount: values.amount,
        method: values.method,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      },
    });
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount ({currency}) *</Label>
            <Input type="number" step="0.01" min="0.01" disabled={recordPayment.isPending} {...register('amount')} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(amountDue, currency)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Method *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={recordPayment.isPending}
              {...register('method')}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference / Transaction ID</Label>
            <Input placeholder="Optional" disabled={recordPayment.isPending} {...register('reference')} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional" disabled={recordPayment.isPending} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={recordPayment.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
