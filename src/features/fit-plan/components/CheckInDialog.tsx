import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCheckInMutation } from '../hooks/use-fit-plan';

const schema = z.object({
  weight: z.coerce.number().positive('Weight must be positive'),
  notes:  z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CheckInDialogProps {
  open:     boolean;
  onClose:  () => void;
}

export default function CheckInDialog({ open, onClose }: CheckInDialogProps) {
  const checkIn = useCheckInMutation();
  const today   = format(new Date(), 'yyyy-MM-dd');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: FormValues) {
    checkIn.mutate(
      { data: { date: today, weight: values.weight, notes: values.notes } },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Weekly Check-In</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input value={format(new Date(), 'MMMM d, yyyy')} readOnly className="bg-muted" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weight">Current Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="e.g. 78.5"
              {...register('weight')}
            />
            {errors.weight && (
              <p className="text-xs text-destructive">{errors.weight.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How are you feeling this week?"
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={checkIn.isPending}>
              {checkIn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Check-In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
