import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserMinus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostTrainersTrainerIdAssignmentsAssignmentIdEnd,
  getGetTrainersQueryKey,
} from '@/api/generated/trainers/trainers';
import type { TrainerAssignment } from './TrainerTab';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  endReason: z.string().max(300).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  assignment:   TrainerAssignment;
  onSuccess:    () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trainerName(a: TrainerAssignment): string {
  const u = a.trainerId?.userId;
  if (!u) return 'this trainer';
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'this trainer';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EndTrainerDialog({ open, onOpenChange, assignment, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { endReason: '' },
  });

  const endMutation = usePostTrainersTrainerIdAssignmentsAssignmentIdEnd({
    mutation: {
      onSuccess: () => {
        toast({
          title: 'Trainer removed',
          description: `Assignment with ${trainerName(assignment)} has been ended.`,
        });
        // Invalidate trainers list so slot counts + availability refresh immediately
        queryClient.invalidateQueries({ queryKey: getGetTrainersQueryKey() });
        reset();
        onOpenChange(false);
        onSuccess();
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to remove trainer',
          description: err?.response?.data?.message ?? 'Something went wrong.',
        });
      },
    },
  });

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function onSubmit(values: FormValues) {
    const trainerId = typeof assignment.trainerId === 'string'
      ? assignment.trainerId
      : assignment.trainerId._id;

    endMutation.mutate({
      trainerId,
      assignmentId: assignment._id,
      data: { reason: values.endReason || undefined },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            Remove Trainer
          </DialogTitle>
          <DialogDescription>
            This will end the assignment with{' '}
            <strong>{trainerName(assignment)}</strong>. The trainer's
            client count will be updated and the assignment will be
            recorded in history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="endReason">Reason (optional)</Label>
            <Input
              id="endReason"
              placeholder="e.g. Member requested change, Trainer left…"
              disabled={endMutation.isPending}
              {...register('endReason')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={endMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={endMutation.isPending}
            >
              {endMutation.isPending ? 'Removing…' : 'Remove Trainer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}