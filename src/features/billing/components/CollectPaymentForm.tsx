import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { usePostPayments } from '@/api/generated/payments/payments';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { getGetInvoicesQueryKey } from '@/api/generated/invoices/invoices';
import { getGetBillingDashboardQueryKey } from '@/api/generated/billing/billing';
import { getGetReportsDashboardQueryKey } from '@/api/generated/reports/reports';
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from '@/api/generated/notifications/notifications';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  paidAmount: z.coerce.number().min(0.01, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']),
  referenceNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CollectPaymentFormProps {
  invoiceId: string;
  amountDue: number;
  currency?: string;
  onSuccess: () => void;
}

export function CollectPaymentForm({
  invoiceId,
  amountDue,
  currency: currencyProp,
  onSuccess,
}: CollectPaymentFormProps) {
  const { currency: tenantCurrency } = useTenantCurrency();
  const currency = currencyProp ?? tenantCurrency;
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidAmount: amountDue,
      paymentMethod: 'cash',
      referenceNumber: '',
    },
  });

  // Sync paidAmount when amountDue changes (different invoice selected)
  useEffect(() => {
    form.setValue('paidAmount', amountDue);
  }, [amountDue, form]);

  const { register, handleSubmit, watch, setValue } = form;
  const payment = watch('paidAmount') || 0;
  const paymentMethod = watch('paymentMethod');
  const needsReference = paymentMethod === 'bank_transfer' || paymentMethod === 'online';

  const { mutate, isPending } = usePostPayments({
    mutation: {
      onSuccess: async () => {
        toast({ title: 'Payment recorded successfully' });
        await queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getGetBillingDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReportsDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        form.reset({ paidAmount: 0, paymentMethod: 'cash', referenceNumber: '' });
        onSuccess();
      },
      onError: () => {
        toast({ variant: 'destructive', title: 'Failed to record payment' });
      },
    },
  });

  const onSubmit = (values: FormValues) => {
    mutate({
      data: {
        invoiceId,
        amount: values.paidAmount,
        method: values.paymentMethod,
        reference: values.referenceNumber || undefined,
      },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Collect Payment
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Payment Amount</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {currency}
            </span>
            <Input
              type="number"
              step="1"
              min="1"
              max={amountDue}
              className="h-8 pl-12 text-sm font-semibold"
              {...register('paidAmount')}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Due: {formatCurrency(amountDue, currency)}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(v) => setValue('paymentMethod', v as FormValues['paymentMethod'])}>
            <SelectTrigger className="h-8 text-sm">
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
            <Label className="text-xs">Reference / Transaction ID</Label>
            <Input
              placeholder="Enter reference number"
              className="h-8 text-sm"
              {...register('referenceNumber')}
            />
          </div>
        )}

        <Button type="submit" disabled={isPending || payment <= 0} className="w-full h-8 text-sm">
          {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          Collect {payment > 0 ? formatCurrency(payment, currency) : 'Payment'}
        </Button>
      </form>
    </div>
  );
}