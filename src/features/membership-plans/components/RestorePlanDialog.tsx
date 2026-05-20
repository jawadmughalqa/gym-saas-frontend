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

interface RestorePlanDialogProps {
  open: boolean;
  planName: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestorePlanDialog({
  open,
  planName,
  isSubmitting,
  onConfirm,
  onCancel,
}: RestorePlanDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Membership Plan</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to restore <strong className="font-semibold">{planName}</strong>?
            <br />
            <br />
            This plan will become available again for new subscriptions.
            Existing archived subscriptions will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-600"
          >
            {isSubmitting ? 'Restoring...' : 'Restore Plan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}