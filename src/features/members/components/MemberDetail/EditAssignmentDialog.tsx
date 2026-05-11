/**
 * EditAssignmentDialog
 *
 * Edits charge / goal / sessions / notes on the active assignment.
 * Does NOT change the trainer — use AssignTrainerDialog for that.
 *
 * PATCH /trainers/:trainerId/assignments/:assignmentId
 */

import { useEffect, useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api }      from '@/lib/axios';
import type { TrainerAssignment } from './TrainerTab';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  monthlyCharge:           z.coerce.number().min(0).optional(),
  currency:                z.string().default('PKR'),
  goal:                    z.string().max(300).optional(),
  sessionFrequencyPerWeek: z.coerce.number().min(1).max(7).optional(),
  notes:                   z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  assignment:   TrainerAssignment;
  onSuccess:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditAssignmentDialog({ open, onOpenChange, assignment, onSuccess }: Props) {
  const { toast }      = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      monthlyCharge:           assignment.monthlyCharge,
      currency:                assignment.currency ?? 'PKR',
      goal:                    assignment.goal ?? '',
      sessionFrequencyPerWeek: assignment.sessionFrequencyPerWeek,
      notes:                   assignment.notes ?? '',
    },
  });

  // Re-populate when the assignment changes (e.g. after a save)
  useEffect(() => {
    if (open) {
      reset({
        monthlyCharge:           assignment.monthlyCharge,
        currency:                assignment.currency ?? 'PKR',
        goal:                    assignment.goal ?? '',
        sessionFrequencyPerWeek: assignment.sessionFrequencyPerWeek,
        notes:                   assignment.notes ?? '',
      });
    }
  }, [open, assignment, reset]);

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const trainerId    = typeof assignment.trainerId === 'string'
        ? assignment.trainerId
        : assignment.trainerId._id;
      const assignmentId = assignment._id;

      await api.patch(`/trainers/${trainerId}/assignments/${assignmentId}`, {
        monthlyCharge:           values.monthlyCharge  || undefined,
        currency:                values.currency,
        goal:                    values.goal           || undefined,
        sessionFrequencyPerWeek: values.sessionFrequencyPerWeek || undefined,
        notes:                   values.notes          || undefined,
      });

      toast({
        title:       'Assignment updated',
        description: 'Trainer assignment details have been saved.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        variant:     'destructive',
        title:       'Failed to update',
        description: err?.response?.data?.message ?? 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Assignment Details</DialogTitle>
          <DialogDescription>
            Update the PT charge, goal, session frequency, or notes for
            this assignment. To change the trainer, use "Change Trainer".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* PT Charge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="monthlyCharge">PT Charge / Month</Label>
              <Input
                id="monthlyCharge"
                type="number"
                min={0}
                step="1"
                placeholder="e.g. 5000"
                disabled={loading}
                {...register('monthlyCharge')}
              />
              {errors.monthlyCharge && (
                <p className="text-xs text-destructive">{errors.monthlyCharge.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('currency') ?? 'PKR'}
                onValueChange={(v) => setValue('currency', v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['PKR', 'USD', 'AED', 'SAR', 'EUR', 'GBP'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sessions per week */}
          <div className="space-y-1.5">
            <Label>Sessions per Week</Label>
            <Select
              value={String(watch('sessionFrequencyPerWeek') ?? '')}
              onValueChange={(v) =>
                setValue('sessionFrequencyPerWeek', v ? Number(v) : undefined)
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}x per week
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal</Label>
            <Input
              id="goal"
              placeholder="e.g. Weight loss, Muscle gain, Rehabilitation"
              disabled={loading}
              {...register('goal')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any additional notes"
              disabled={loading}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}