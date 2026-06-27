import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
}
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { usePatchTrainersTrainerIdAssignmentsAssignmentId } from '@/api/generated/trainers/trainers';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import type { TrainerAssignment } from './TrainerTab';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  monthlyCharge:           z.coerce.number().min(0).optional(),
  currency:                z.string(),
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the trainer's default monthlyRate from the populated trainerId object, if available. */
function getTrainerDefaultRate(assignment: TrainerAssignment): number | undefined {
  if (typeof assignment.trainerId === 'object' && assignment.trainerId !== null) {
    // Model stores it as 'hourlyRate' — fall back to 'monthlyRate' for legacy data
    return (assignment.trainerId as any).hourlyRate ?? (assignment.trainerId as any).monthlyRate ?? undefined;
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditAssignmentDialog({ open, onOpenChange, assignment, onSuccess }: Props) {
  const { currency: tenantCurrency } = useTenantCurrency();
  const defaultCharge = assignment.monthlyCharge ?? getTrainerDefaultRate(assignment);

  // Trainer's availability — from the populated trainerId object if present
  const trainerAvailability: AvailabilitySlot[] =
    (typeof assignment.trainerId === 'object' && assignment.trainerId !== null)
      ? ((assignment.trainerId as any).availability ?? [])
      : [];

  const slotsByDay = trainerAvailability.reduce<Record<number, AvailabilitySlot[]>>(
    (acc, slot) => { if (!acc[slot.day]) acc[slot.day] = []; acc[slot.day].push(slot); return acc; },
    {},
  );

  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>(
    (assignment as any).scheduledSlots ?? [],
  );

  function toggleSlot(slot: AvailabilitySlot) {
    setSelectedSlots((prev) => {
      const exists = prev.some(s => s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime);
      return exists
        ? prev.filter(s => !(s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime))
        : [...prev, slot];
    });
  }

  function isSlotSelected(slot: AvailabilitySlot) {
    return selectedSlots.some(s => s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime);
  }

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
      monthlyCharge:           defaultCharge,
      currency:                assignment.currency ?? tenantCurrency,
      goal:                    assignment.goal ?? '',
      sessionFrequencyPerWeek: assignment.sessionFrequencyPerWeek,
      notes:                   assignment.notes ?? '',
    },
  });

  const updateMutation = usePatchTrainersTrainerIdAssignmentsAssignmentId({
    mutation: {
      onSuccess: () => {
        toast({
          title: 'Assignment updated',
          description: 'Trainer assignment details have been saved.',
        });
        onOpenChange(false);
        onSuccess();
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to update',
          description: err?.response?.data?.message ?? 'Something went wrong.',
        });
      },
    },
  });

  useEffect(() => {
    if (open) {
      const charge = assignment.monthlyCharge ?? getTrainerDefaultRate(assignment);
      reset({
        monthlyCharge:           charge,
        currency:                assignment.currency ?? tenantCurrency,
        goal:                    assignment.goal ?? '',
        sessionFrequencyPerWeek: assignment.sessionFrequencyPerWeek,
        notes:                   assignment.notes ?? '',
      });
      setSelectedSlots((assignment as any).scheduledSlots ?? []);
    }
  }, [open, assignment, reset]);

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function onSubmit(values: FormValues) {
    const trainerId = typeof assignment.trainerId === 'string'
      ? assignment.trainerId
      : assignment.trainerId._id;

    updateMutation.mutate({
      trainerId,
      assignmentId: assignment._id,
      data: {
        monthlyCharge: values.monthlyCharge || undefined,
        currency: values.currency,
        goal: values.goal || undefined,
        sessionFrequencyPerWeek: values.sessionFrequencyPerWeek || undefined,
        scheduledSlots: selectedSlots.length > 0 ? selectedSlots : [],
        notes: values.notes || undefined,
      },
    });
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="monthlyCharge">PT Charge / Month</Label>
              <Input
                id="monthlyCharge"
                type="number"
                min={0}
                step="1"
                placeholder="e.g. 5000"
                disabled={updateMutation.isPending}
                {...register('monthlyCharge')}
              />
              {errors.monthlyCharge && (
                <p className="text-xs text-destructive">{errors.monthlyCharge.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('currency') ?? tenantCurrency}
                onValueChange={(v) => setValue('currency', v)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={tenantCurrency} value={tenantCurrency}>{tenantCurrency}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sessions per Week</Label>
            <Select
              value={String(watch('sessionFrequencyPerWeek') ?? '')}
              onValueChange={(v) =>
                setValue('sessionFrequencyPerWeek', v ? Number(v) : undefined)
              }
              disabled={updateMutation.isPending}
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

          {/* Scheduled slots */}
          <div className="space-y-1.5">
            <Label>
              Scheduled Slots{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            {trainerAvailability.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No availability slots set on this trainer's profile.
              </p>
            ) : (
              <div className="space-y-2 rounded-md border p-3">
                {Object.entries(slotsByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, slots]) => (
                    <div key={day} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {DAY_NAMES[Number(day)]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {slots.map((slot, i) => {
                          const selected = isSlotSelected(slot);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleSlot(slot)}
                              disabled={updateMutation.isPending}
                              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background hover:border-primary/50 text-foreground'
                              }`}
                            >
                              {selected && <Check className="h-3 w-3" />}
                              {slot.startTime} – {slot.endTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {selectedSlots.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedSlots
                  .sort((a, b) => a.day - b.day)
                  .map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {DAY_NAMES[s.day]} {s.startTime}–{s.endTime}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal</Label>
            <Input
              id="goal"
              placeholder="e.g. Weight loss, Muscle gain, Rehabilitation"
              disabled={updateMutation.isPending}
              {...register('goal')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Any additional notes"
              disabled={updateMutation.isPending}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}