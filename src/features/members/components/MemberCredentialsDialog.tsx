import { useState } from 'react';
import { Copy, Check, KeyRound, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  loginEmail: string;
  tempPassword: string;
}

// ─── Copy helper ──────────────────────────────────────────────────────────────

function CopyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 font-mono text-sm select-all">{value}</span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Copy"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberCredentialsDialog({
  open,
  onOpenChange,
  memberName,
  loginEmail,
  tempPassword,
}: MemberCredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Login Credentials</DialogTitle>
          <DialogDescription>
            <strong>{memberName}</strong> has been registered. Share these credentials with them
            so they can log in to the mobile app. They will be asked to set a new password on
            first login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <CopyField
            label="Email"
            value={loginEmail}
            icon={<Mail className="h-4 w-4" />}
          />
          <CopyField
            label="Temporary Password"
            value={tempPassword}
            icon={<KeyRound className="h-4 w-4" />}
          />
        </div>

        <p className="text-xs text-muted-foreground bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 dark:border-amber-800 rounded-lg px-3 py-2">
          ⚠️ Save these credentials now — the password cannot be retrieved again. If lost, use
          <strong> Resend Credentials</strong> on the member's profile to generate a new one.
        </p>

        <Button className="w-full mt-1" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
