import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Users, CheckCircle2, Loader2, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  broadcastMessage,
  type BroadcastPayload,
  type RecipientGroup,
  type BroadcastChannel,
  type BroadcastResult,
} from '@/api/notificationConfig.api';

// ─── Dropdown (pure-JS, no native select) ────────────────────────────────────

const RECIPIENT_OPTIONS: { value: RecipientGroup; label: string; desc: string }[] = [
  { value: 'all',     label: 'All Members',     desc: 'Every non-archived member' },
  { value: 'active',  label: 'Active Members',  desc: 'Members with an active subscription' },
  { value: 'overdue', label: 'Overdue Members', desc: 'Members with unpaid or overdue invoices' },
];

function RecipientDropdown({
  value,
  onChange,
}: {
  value: RecipientGroup;
  onChange: (v: RecipientGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = RECIPIENT_OPTIONS.find((o) => o.value === value)!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent transition-colors"
      >
        <span>{selected.label}</span>
        <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {RECIPIENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                opt.value === value ? 'bg-accent font-medium' : ''
              }`}
            >
              <div>{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Channel toggle pill ──────────────────────────────────────────────────────

function ChannelPill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-accent'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Result banner ────────────────────────────────────────────────────────────

function ResultBanner({ result }: { result: BroadcastResult }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-medium text-green-800 dark:text-green-300">Message sent!</p>
        <p className="text-green-700 dark:text-green-400 mt-0.5">
          {result.sent} delivered · {result.failed} failed · {result.skipped} skipped (no contact) · {result.total} total recipients
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BroadcastPage() {
  const { toast } = useToast();

  const [subject,        setSubject]        = useState('');
  const [message,        setMessage]        = useState('');
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('all');
  const [channels,       setChannels]       = useState<BroadcastChannel[]>(['email']);
  const [lastResult,     setLastResult]     = useState<BroadcastResult | null>(null);

  const toggleChannel = (ch: BroadcastChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const needsSubject = channels.includes('email');

  const mutation = useMutation({
    mutationFn: (payload: BroadcastPayload) => broadcastMessage(payload),
    onSuccess: (result) => {
      setLastResult(result);
      toast({ title: `Sent to ${result.sent} of ${result.total} members` });
    },
    onError: (err: any) => {
      toast({
        title: 'Broadcast failed',
        description: err?.response?.data?.message ?? 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (channels.length === 0) {
      toast({ title: 'Select at least one channel', variant: 'destructive' });
      return;
    }
    setLastResult(null);
    mutation.mutate({ subject, message, recipientGroup, channels });
  };

  const canSend =
    message.trim().length > 0 &&
    channels.length > 0 &&
    (!needsSubject || subject.trim().length > 0) &&
    !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Send Message</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send a custom message to a group of your members.
        </p>
      </div>

      {/* Step 1 — Compose */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Message</CardTitle>
          <CardDescription>Write what you want to send.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsSubject && (
            <div className="space-y-1.5">
              <Label htmlFor="subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="e.g. Gym closure this Saturday"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground text-right">{subject.length} / 120</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length} characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Recipients
          </CardTitle>
          <CardDescription>Choose who receives this message.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecipientDropdown value={recipientGroup} onChange={setRecipientGroup} />
        </CardContent>
      </Card>

      {/* Step 3 — Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Send via</CardTitle>
          <CardDescription>
            Channels must be configured in{' '}
            <a href="/settings/notifications" className="underline text-primary">
              Notification Channels
            </a>{' '}
            first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <ChannelPill
              icon={Mail}
              label="Email"
              active={channels.includes('email')}
              onClick={() => toggleChannel('email')}
            />
            <ChannelPill
              icon={MessageCircle}
              label="WhatsApp"
              active={channels.includes('whatsapp')}
              onClick={() => toggleChannel('whatsapp')}
            />
          </div>
          {channels.length === 0 && (
            <p className="text-xs text-destructive mt-2">Select at least one channel.</p>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {lastResult && <ResultBanner result={lastResult} />}

      {/* Send button */}
      <div className="flex justify-end">
        <Button onClick={handleSend} disabled={!canSend} size="lg" className="gap-2">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {mutation.isPending ? 'Sending…' : 'Send to Members'}
        </Button>
      </div>
    </div>
  );
}
