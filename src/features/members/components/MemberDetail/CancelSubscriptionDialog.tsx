/**
 * CancelSubscriptionDialog
 *
 * Collects a cancellation reason from the gym owner before calling the
 * cancel endpoint. Replaces the old generic ConfirmDialog which hardcoded
 * "Cancelled by staff" with no input.
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button }  from '@/components/ui/button';
import { Label }   from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast }   from '@/hooks/use-toast';
import { usePostMembersMemberIdSubscriptionsSubscriptionIdCancel } from '@/api/generated/members/members';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  memberId:       string;
  subscriptionId: string;
  planName:       string;
  onSuccess:      () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelSubscriptionDialog({
  open, onOpenChange, memberId, subscriptionId, planName, onSuccess,
}: Props) {
  const [reason, setReason] = useState('');

  const cancelMutation = usePostMembersMemberIdSubscriptionsSubscriptionIdCancel({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Subscription cancelled', description: `${planName} has been cancelled.` });
        onOpenChange(false);
        onSuccess();
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to cancel',
          description: err?.response?.data?.message ?? 'Something went wrong.',
        });
      },
    },
  });

  function handleClose(open: boolean) {
    if (!open) setReason('');
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    cancelMutation.mutate({ memberId, subscriptionId, data: { reason: reason.trim() } });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            You are about to cancel <strong>{planName}</strong>. This cannot be undone.
            Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">Reason <span className="text-destructive">*</span></Label>
            <Textarea
              id="cancelReason"
              placeholder="e.g. Member requested cancellation, moved abroad…"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={cancelMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={cancelMutation.isPending}
          >
            Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
