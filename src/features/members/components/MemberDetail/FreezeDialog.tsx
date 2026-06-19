import { useForm }    from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Loader2 }     from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Label }  from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostMembersMemberIdSubscriptionsSubscriptionIdFreeze,
  getGetMembersMemberIdSubscriptionsQueryKey,
  getGetMembersMemberIdQueryKey,
} from '@/api/generated/members/members';
import { useToast } from '@/hooks/use-toast';

// ─── Schema ───────────────────────────────────────────────────────────────────

const freezeSchema = z.object({
  resumeAt: z.string().min(1, 'Resume date is required'),
  reason:   z.string().optional(),
});

type FreezeFormValues = z.infer<typeof freezeSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface FreezeDialogProps {
  memberId:       string;
  subscriptionId: string;
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FreezeDialog({
  memberId,
  subscriptionId,
  open,
  onOpenChange,
}: FreezeDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const freezeMutation = usePostMembersMemberIdSubscriptionsSubscriptionIdFreeze({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
        });
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdQueryKey(memberId),
        });
        toast({ title: 'Subscription frozen', description: 'Membership has been frozen successfully.' });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const message =
          (err as Error)?.message ?? 'Failed to freeze subscription. Please try again.';
        toast({ title: 'Freeze failed', description: message, variant: 'destructive' });
      },
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FreezeFormValues>({
    resolver: zodResolver(freezeSchema),
  });

  function onSubmit(values: FreezeFormValues) {
    freezeMutation.mutate({
      memberId,
      subscriptionId,
      data: { resumeAt: values.resumeAt, reason: values.reason },
    });
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Freeze Subscription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resumeAt">Resume Date *</Label>
            <Input
              id="resumeAt"
              type="date"
              disabled={freezeMutation.isPending}
              {...register('resumeAt')}
            />
            {errors.resumeAt && (
              <p className="text-xs text-destructive">{errors.resumeAt.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="freezeReason">Reason (optional)</Label>
            <Input
              id="freezeReason"
              placeholder="e.g. Travelling"
              disabled={freezeMutation.isPending}
              {...register('reason')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={freezeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={freezeMutation.isPending}>
              {freezeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Freeze
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}