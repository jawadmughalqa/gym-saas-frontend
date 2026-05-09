import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSubscription, useMembershipPlans } from '../hooks/use-members';

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  planId:    z.string().min(1, 'Plan is required'),
  branchId:  z.string().min(1, 'Branch is required'),
  startDate: z.string().optional(),
  notes:     z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubscriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  defaultBranchId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionForm({
  open, onOpenChange, memberId, defaultBranchId,
}: SubscriptionFormProps) {
  const { data: plans, isLoading: loadingPlans } = useMembershipPlans();
  const createSubscription = useCreateSubscription(memberId, { onSuccess: () => onOpenChange(false) });
  const isPending = createSubscription.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId:    '',
      branchId:  defaultBranchId ?? '',
      startDate: '',
      notes:     '',
    },
  });

  function onSubmit(values: FormValues) {
    createSubscription.mutate({
      planId:    values.planId,
      branchId:  values.branchId,
      startDate: values.startDate || undefined,
      notes:     values.notes || undefined,
    });
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">Assign Membership Plan</h2>
          <p className="text-sm text-muted-foreground">
            Select a plan to activate for this member.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

          {/* Plan */}
          <div className="space-y-1.5">
            <Label>Plan *</Label>
            <Select
              value={watch('planId')}
              onValueChange={(v) => setValue('planId', v)}
              disabled={isPending || loadingPlans}
            >
              <SelectTrigger className={errors.planId ? 'border-destructive' : ''}>
                <SelectValue placeholder={loadingPlans ? 'Loading plans…' : 'Select a plan'} />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan._id} value={plan._id}>
                    <span>{plan.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {plan.currency} {plan.basePrice} / {plan.billingFrequency}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && <p className="text-xs text-destructive">{errors.planId.message}</p>}
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="branchId">Branch *</Label>
            <Input
              id="branchId"
              placeholder="Branch ID"
              disabled={isPending}
              className={errors.branchId ? 'border-destructive' : ''}
              {...register('branchId')}
            />
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              disabled={isPending}
              {...register('startDate')}
            />
            <p className="text-xs text-muted-foreground">Leave blank to start today.</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="subNotes">Notes</Label>
            <Textarea
              id="subNotes"
              placeholder="Optional notes…"
              disabled={isPending}
              {...register('notes')}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button
              type="button" variant="outline" className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || loadingPlans}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Plan
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
