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
import { getGetInvoicesQueryKey } from '@/api/generated/invoices/invoices';

const formSchema = z.object({
  discountAmount: z.coerce.number().min(0, 'Discount cannot be negative'),
  paidAmount: z.coerce.number().min(0.01, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']),
  referenceNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CollectPaymentFormProps {
  memberId: string;
  totalDue: number;
  onSuccess: (transactionCode: string) => void;
}

export function CollectPaymentForm({ memberId, totalDue, onSuccess }: CollectPaymentFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      discountAmount: 0,
      paidAmount: totalDue,
      paymentMethod: 'cash',
      referenceNumber: '',
    },
  });

  const { register, handleSubmit, watch, formState, setValue } = form;
  const discount = watch('discountAmount') || 0;
  const payment = watch('paidAmount') || 0;
  const paymentMethod = watch('paymentMethod');
  const referenceNumber = watch('referenceNumber') || '';

  const netDue = Math.max(0, totalDue - discount);
  const needsReference = paymentMethod === 'bank_transfer' || paymentMethod === 'online';

  const { mutate, isPending } = usePostPayments({
    mutation: {
      onSuccess: async (response: any) => {
        if (response.transaction_code) {
          onSuccess(response.transaction_code);
        }
        await queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        form.reset();
      },

    },
  });

  const onSubmit = (values: FormValues) => {
    mutate({
      data: {
        invoiceId: '', // You'll need to select which invoice to pay
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
          <Label className="text-xs">Discount (optional)</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              PKR
            </span>
            <Input
              type="number"
              placeholder="0"
              className="h-8 pl-10 text-sm"
              {...register('discountAmount')}
              value={discount === 0 ? '' : discount}
              onChange={(e) => setValue('discountAmount', e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payment Amount</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              PKR
            </span>
            <Input
              type="number"
              placeholder={netDue.toString()}
              className="h-8 pl-10 text-sm font-semibold"
              {...register('paidAmount')}
            />
          </div>
          <p className="text-xs text-muted-foreground">Net due after discount: {formatCurrency(netDue, 'PKR')}</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(v) => setValue('paymentMethod', v as any)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="online">Online</SelectItem>
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

        <Button type="submit" disabled={isPending || payment > netDue} className="w-full">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Collect {payment > 0 ? formatCurrency(payment, 'PKR') : 'Payment'}
        </Button>
      </form>
    </div>
  );
}