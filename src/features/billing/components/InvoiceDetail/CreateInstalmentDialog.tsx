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
  usePostInstalments,
} from '@/api/generated/instalments/instalments';
import { getGetInvoicesInvoiceIdQueryKey } from '@/api/generated/invoices/invoices';

// ─── Schema ───────────────────────────────────────────────────────────────────

const instalmentSchema = z.object({
  numberOfInstalments: z.coerce.number().int().min(2).max(60),
  frequencyDays: z.coerce.number().int().min(1),
  downPayment: z.coerce.number().min(0).optional(),
  startDate: z.string().optional(),
});
type InstalmentFormValues = z.infer<typeof instalmentSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  invoiceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function CreateInstalmentDialog({ invoiceId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const create = usePostInstalments({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
        toast({ title: 'Instalment plan created' });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to create instalment plan',
          description: err?.response?.data?.message || err?.message,
        });
      },
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InstalmentFormValues>({
    resolver: zodResolver(instalmentSchema),
    defaultValues: { numberOfInstalments: 3, frequencyDays: 30, downPayment: 0 },
  });

  function onSubmit(values: InstalmentFormValues) {
    create.mutate({
      data: {
        invoiceId,
        numberOfInstalments: values.numberOfInstalments,
        frequencyDays: values.frequencyDays,
        downPayment: values.downPayment || 0,
        startDate: values.startDate || undefined,
      },
    });
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Instalment Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Number of Instalments *</Label>
              <Input type="number" min={2} max={60} disabled={create.isPending} {...register('numberOfInstalments')} />
              {errors.numberOfInstalments && (
                <p className="text-xs text-destructive">{errors.numberOfInstalments.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Frequency (days) *</Label>
              <Input type="number" min={1} disabled={create.isPending} {...register('frequencyDays')} />
              {errors.frequencyDays && (
                <p className="text-xs text-destructive">{errors.frequencyDays.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Down Payment</Label>
            <Input type="number" step="0.01" min={0} placeholder="0.00" disabled={create.isPending} {...register('downPayment')} />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" disabled={create.isPending} {...register('startDate')} />
            <p className="text-xs text-muted-foreground">Defaults to today.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
