import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  usePostInvoicesInvoiceIdDiscount,
  getGetInvoicesInvoiceIdQueryKey,
  getGetInvoicesQueryKey,
} from '@/api/generated/invoices/invoices';

const discountSchema = z.object({ discountCode: z.string().min(1, 'Code is required') });
type DiscountFormValues = z.infer<typeof discountSchema>;

interface Props {
  invoiceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ApplyDiscountDialog({ invoiceId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const apply = usePostInvoicesInvoiceIdDiscount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
        queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        toast({ title: 'Discount applied successfully' });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to apply discount',
          description: err?.response?.data?.message || err?.message,
        });
      },
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
  });

  function onSubmit(values: DiscountFormValues) {
    apply.mutate({ invoiceId, data: { discountCode: values.discountCode } });
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply Discount Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Discount Code *</Label>
            <Input placeholder="e.g. SUMMER25" disabled={apply.isPending} {...register('discountCode')} />
            {errors.discountCode && <p className="text-xs text-destructive">{errors.discountCode.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={apply.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
