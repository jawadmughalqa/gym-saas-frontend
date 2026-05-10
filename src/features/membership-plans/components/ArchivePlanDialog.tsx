import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ArchivePlanDialogProps {
  open: boolean;
  planName: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchivePlanDialog({
  open,
  planName,
  isSubmitting,
  onConfirm,
  onCancel,
}: ArchivePlanDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Membership Plan</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive <strong>{planName}</strong>?
            <br />
            This plan will no longer be available for new subscriptions.
            Existing subscriptions will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? 'Archiving...' : 'Archive Plan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}