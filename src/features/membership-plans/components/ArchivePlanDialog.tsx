import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ArchivePlanDialogProps {
  open: boolean;
  planName: string;
  activeSubscriptionCount?: number;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchivePlanDialog({
  open,
  planName,
  activeSubscriptionCount = 0,
  isSubmitting,
  onConfirm,
  onCancel,
}: ArchivePlanDialogProps) {
  return (
    // Don't allow closing by clicking outside or pressing Escape while submitting
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Membership Plan</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Are you sure you want to archive <strong className="text-foreground">{planName}</strong>?
                This plan will no longer be available for new subscriptions.
              </p>
              {activeSubscriptionCount > 0 ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive font-medium">
                  ⚠ This plan has {activeSubscriptionCount} active subscriber
                  {activeSubscriptionCount !== 1 ? 's' : ''}. Cancel or expire those
                  subscriptions before archiving.
                </p>
              ) : (
                <p>Existing subscriptions will not be affected.</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting || activeSubscriptionCount > 0}
          >
            {isSubmitting ? 'Archiving…' : 'Archive Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
