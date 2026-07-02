import { useState } from 'react';
import { Fingerprint, Trash2, ShieldCheck, ShieldX, Plus, Loader2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCredentials,
  useEnrollFingerprint,
  useTestAccess,
  useDeleteCredential,
  type BiometricCredential,
} from '@/api/biometric.api';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  memberId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ─── Enroll dialog ────────────────────────────────────────────────────────────

function EnrollDialog({
  memberId,
  open,
  onClose,
}: {
  memberId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const enroll = useEnrollFingerprint(memberId);

  const handleEnroll = async () => {
    if (!label.trim()) { toast({ variant: 'destructive', title: 'Enter a label first' }); return; }
    try {
      await enroll.mutateAsync(label.trim());
      toast({ title: 'Fingerprint enrolled successfully' });
      setLabel('');
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Enrollment failed';
      if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('canceled')) {
        toast({ title: 'Touch ID cancelled' });
      } else {
        toast({ variant: 'destructive', title: 'Enrollment failed', description: msg });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-violet-500" />
            Enroll Fingerprint
          </DialogTitle>
          <DialogDescription>
            Give this fingerprint a label (e.g. "Right index finger"), then click Enroll and touch your sensor when prompted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fp-label">Label</Label>
            <Input
              id="fp-label"
              placeholder="e.g. Right index finger"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnroll()}
              maxLength={100}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your browser will prompt for Touch ID / Face ID / Windows Hello after clicking Enroll.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enroll.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={enroll.isPending || !label.trim()}
            className="gap-2"
          >
            {enroll.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enrolling…</>
            ) : (
              <><Fingerprint className="h-4 w-4" /> Enroll</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Credential card ──────────────────────────────────────────────────────────

function CredentialCard({
  credential,
  onDelete,
}: {
  credential: BiometricCredential;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
          <Fingerprint className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-medium">{credential.label}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Enrolled {formatRelative(credential.enrolledAt)}</span>
            {credential.lastUsedAt && (
              <span>· Last used {formatRelative(credential.lastUsedAt)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs capitalize">
          {credential.deviceType === 'platform' ? 'Built-in sensor' : 'External key'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(credential._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function FingerprintTab({ memberId }: Props) {
  const [enrollOpen, setEnrollOpen]   = useState(false);
  const [deleteId,   setDeleteId]     = useState<string | null>(null);

  const { data: credentials, isLoading } = useCredentials(memberId);
  const testAccess   = useTestAccess(memberId);
  const deleteCredMut = useDeleteCredential(memberId);

  const handleTest = async () => {
    try {
      const result = await testAccess.mutateAsync();
      if (result.allow && result.alreadyIn) {
        toast({ title: `✅ Already checked in today — ${result.memberName ?? 'Member'}` });
      } else if (result.allow) {
        toast({ title: `✅ Access granted — ${result.memberName ?? 'Member'} can enter` });
      } else {
        toast({ variant: 'destructive', title: '❌ Access denied', description: result.reason ?? 'Unknown reason' });
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Test failed';
      if (msg.includes('NotAllowedError') || msg.includes('cancelled') || msg.includes('canceled')) {
        toast({ title: 'Touch ID cancelled' });
      } else {
        toast({ variant: 'destructive', title: 'Test failed', description: msg });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCredMut.mutateAsync(deleteId);
      toast({ title: 'Credential removed' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to remove credential' });
    } finally {
      setDeleteId(null);
    }
  };

  const credList = Array.isArray(credentials) ? credentials : (credentials as any)?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-5 w-5 text-violet-500" />
                Biometric Access
              </CardTitle>
              <CardDescription className="mt-1">
                Enrolled fingerprints allow this member to open the gym door by touching a sensor. Works with Touch ID (MacBook), Face ID (iPhone), or any FIDO2 device.
              </CardDescription>
            </div>
            <Button
              onClick={() => setEnrollOpen(true)}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Enroll Fingerprint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Test access button */}
          {credList.length > 0 && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testAccess.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              {testAccess.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
              ) : (
                <><ShieldCheck className="h-4 w-4 text-green-500" /> Test Access</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Credentials list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Enrolled Credentials ({credList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : credList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <ShieldX className="h-10 w-10 opacity-30" />
              <div>
                <p className="text-sm font-medium">No fingerprints enrolled</p>
                <p className="text-xs mt-1">Click "Enroll Fingerprint" to register this member's biometric</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {credList.map((c: BiometricCredential) => (
                <CredentialCard
                  key={c._id}
                  credential={c}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll dialog */}
      <EnrollDialog
        memberId={memberId}
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove fingerprint?</AlertDialogTitle>
            <AlertDialogDescription>
              This credential will be permanently deleted. The member will no longer be able to use it to access the gym.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCredMut.isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
