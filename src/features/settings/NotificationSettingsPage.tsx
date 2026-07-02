import { useState, useEffect } from 'react';
import {
  Mail, MessageSquare, Bell, CheckCircle2, Loader2,
  Eye, EyeOff, Send, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CardSkeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationConfig,
  saveSmtp,
  testSmtp,
  saveWhatsApp,
  verifyWhatsApp,
  testWhatsApp,
  saveReminders,
  type SaveSmtpPayload,
  type SaveWhatsAppPayload,
} from '@/api/notificationConfig.api';

// ─── Reminder day chips ───────────────────────────────────────────────────────

const PRESET_DAYS = [1, 2, 3, 5, 7, 10, 14, 30];

function DayChip({ day, selected, onToggle }: { day: number; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-foreground border-border hover:border-primary'
      }`}
    >
      {day}d
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['notification-config'],
    queryFn:  getNotificationConfig,
  });

  // ── SMTP state ─────────────────────────────────────────────────────────────
  const [smtp, setSmtp] = useState<SaveSmtpPayload>({
    enabled: false, host: '', port: 587, secure: false,
    user: '', pass: '', fromName: '', fromEmail: '',
  });
  const [showPass,   setShowPass]   = useState(false);
  const [testEmail,  setTestEmail]  = useState('');
  const [smtpTestOk, setSmtpTestOk] = useState(false);

  // ── WhatsApp state ─────────────────────────────────────────────────────────
  const [wa, setWa] = useState<SaveWhatsAppPayload>({
    enabled: false, accessToken: '', phoneNumberId: '',
  });
  const [showToken,    setShowToken]    = useState(false);
  const [testPhone,    setTestPhone]    = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // ── Reminder state ─────────────────────────────────────────────────────────
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays,    setReminderDays]    = useState<number[]>([3]);

  // Sync from server once loaded
  useEffect(() => {
    if (!config) return;
    setSmtp({
      enabled:   config.smtp.enabled,
      host:      config.smtp.host,
      port:      config.smtp.port,
      secure:    config.smtp.secure,
      user:      config.smtp.user,
      pass:      '',   // never pre-fill password
      fromName:  config.smtp.fromName,
      fromEmail: config.smtp.fromEmail,
    });
    setWa({
      enabled:       config.whatsapp.enabled,
      accessToken:   '',   // never pre-fill token
      phoneNumberId: config.whatsapp.phoneNumberId,
    });
    setReminderEnabled(config.reminderEnabled);
    setReminderDays(config.reminderDays);
  }, [config]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveSMTPMut = useMutation({
    mutationFn: () => saveSmtp(smtp),
    onSuccess: () => {
      toast({ title: 'SMTP settings saved' });
      qc.invalidateQueries({ queryKey: ['notification-config'] });
    },
    onError: () => toast({ title: 'Failed to save SMTP settings', variant: 'destructive' }),
  });

  const testSMTPMut = useMutation({
    mutationFn: () => testSmtp({
      to: testEmail,
      host: smtp.host, port: smtp.port, secure: smtp.secure,
      user: smtp.user, pass: smtp.pass || undefined,
      fromName: smtp.fromName, fromEmail: smtp.fromEmail,
    }),
    onSuccess: () => {
      toast({ title: `Test email sent to ${testEmail}` });
      setSmtpTestOk(true);
      setTimeout(() => setSmtpTestOk(false), 3000);
    },
    onError: () => toast({ title: 'Test email failed — check SMTP credentials', variant: 'destructive' }),
  });

  const saveWAMut = useMutation({
    mutationFn: () => saveWhatsApp(wa),
    onSuccess: () => {
      toast({ title: 'WhatsApp settings saved' });
      qc.invalidateQueries({ queryKey: ['notification-config'] });
      // Clear token field after save (like passwords — don't show stored secrets)
      setWa((prev) => ({ ...prev, accessToken: '' }));
    },
    onError: () => toast({ title: 'Failed to save WhatsApp settings', variant: 'destructive' }),
  });

  const verifyWAMut = useMutation({
    mutationFn: () => verifyWhatsApp(
      wa.accessToken && wa.phoneNumberId
        ? { accessToken: wa.accessToken, phoneNumberId: wa.phoneNumberId }
        : undefined,
    ),
    onSuccess: (data) => {
      setVerifiedPhone(data.phoneNumber);
      toast({ title: `Verified! Phone: ${data.phoneNumber}` });
    },
    onError: (err: any) => toast({
      title: 'Verification failed',
      description: err?.response?.data?.message ?? 'Check your Access Token and Phone Number ID',
      variant: 'destructive',
    }),
  });

  const testWAMut = useMutation({
    mutationFn: () => testWhatsApp(testPhone),
    onSuccess: () => toast({ title: `Test message sent to ${testPhone}` }),
    onError:   (err: any) => toast({
      title: 'WhatsApp test failed',
      description: err?.response?.data?.message ?? 'Check credentials and phone number',
      variant: 'destructive',
    }),
  });

  const saveRemindersMut = useMutation({
    mutationFn: () => saveReminders({ enabled: reminderEnabled, days: reminderDays }),
    onSuccess: () => {
      toast({ title: 'Reminder settings saved' });
      qc.invalidateQueries({ queryKey: ['notification-config'] });
    },
    onError: () => toast({ title: 'Failed to save reminder settings', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Notification Channels" subtitle="Configure email and WhatsApp delivery" />
        <div className="space-y-4 max-w-2xl">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageShell>
    );
  }

  const toggleReminderDay = (day: number) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const waConfigured = config?.whatsapp.hasToken && config?.whatsapp.phoneNumberId;

  return (
    <PageShell>
      <PageHeader title="Notification Channels" subtitle="Configure SMTP and WhatsApp for automated payment reminders" />

      <div className="space-y-6 max-w-2xl">

        {/* ── SMTP ─────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Email (SMTP)</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="smtp-enabled" className="text-sm text-muted-foreground">Enable</Label>
                <Switch
                  id="smtp-enabled"
                  checked={smtp.enabled}
                  onCheckedChange={(v) => setSmtp((s) => ({ ...s, enabled: v }))}
                />
              </div>
            </div>
            <CardDescription>
              Connect your own SMTP server to send payment reminder emails from your domain.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {smtp.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Host</Label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtp.host}
                      onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      placeholder="587"
                      value={smtp.port}
                      onChange={(e) => setSmtp((s) => ({ ...s, port: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input
                      placeholder="you@yourdomain.com"
                      value={smtp.user}
                      onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Password{' '}
                      {config?.smtp.hasPass && (
                        <span className="text-xs text-muted-foreground">(stored — leave blank to keep)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPass ? 'text' : 'password'}
                        placeholder={config?.smtp.hasPass ? '••••••••' : 'Enter password'}
                        value={smtp.pass}
                        onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPass((v) => !v)}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>From name</Label>
                    <Input
                      placeholder="My Gym"
                      value={smtp.fromName}
                      onChange={(e) => setSmtp((s) => ({ ...s, fromName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>From email</Label>
                    <Input
                      placeholder="noreply@mygym.com"
                      value={smtp.fromEmail}
                      onChange={(e) => setSmtp((s) => ({ ...s, fromEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="smtp-secure"
                    checked={smtp.secure}
                    onCheckedChange={(v) => setSmtp((s) => ({ ...s, secure: v }))}
                  />
                  <Label htmlFor="smtp-secure" className="text-sm">Use SSL/TLS (port 465)</Label>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Test recipient email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    variant={smtpTestOk ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => testSMTPMut.mutate()}
                    disabled={!testEmail || testSMTPMut.isPending}
                  >
                    {testSMTPMut.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      : smtpTestOk
                        ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-400" />
                        : <Send className="h-3.5 w-3.5 mr-1" />}
                    {smtpTestOk ? 'Sent!' : 'Send test'}
                  </Button>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => saveSMTPMut.mutate()}
                disabled={saveSMTPMut.isPending}
                size="sm"
              >
                {saveSMTPMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save SMTP settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── WhatsApp Cloud API ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">WhatsApp</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {waConfigured && (
                  <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Configured
                  </Badge>
                )}
                <Label htmlFor="wa-enabled" className="text-sm text-muted-foreground">Enable</Label>
                <Switch
                  id="wa-enabled"
                  checked={wa.enabled}
                  onCheckedChange={(v) => setWa((s) => ({ ...s, enabled: v }))}
                />
              </div>
            </div>
            <CardDescription className="flex items-center gap-1.5 flex-wrap">
              Uses the official WhatsApp Business Cloud API — no QR scanning required.
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary underline text-xs"
              >
                How to get credentials <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Access Token{' '}
                {config?.whatsapp.hasToken && (
                  <span className="text-xs text-muted-foreground">(stored — leave blank to keep)</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder={config?.whatsapp.hasToken ? '••••••••••••••••' : 'Paste your permanent access token'}
                  value={wa.accessToken}
                  onChange={(e) => setWa((s) => ({ ...s, accessToken: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                From Meta Business → WhatsApp → API Setup → Permanent token
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input
                placeholder="e.g. 123456789012345"
                value={wa.phoneNumberId}
                onChange={(e) => setWa((s) => ({ ...s, phoneNumberId: e.target.value }))}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                From Meta Business → WhatsApp → API Setup → Phone number ID (not the phone number itself)
              </p>
            </div>

            {/* Verify button */}
            {(wa.accessToken || config?.whatsapp.hasToken) && wa.phoneNumberId && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyWAMut.mutate()}
                  disabled={verifyWAMut.isPending}
                >
                  {verifyWAMut.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                  Verify credentials
                </Button>
                {verifiedPhone && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> {verifiedPhone}
                  </span>
                )}
              </div>
            )}

            {wa.enabled && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Send test message</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. 923001234567 (no +)"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWAMut.mutate()}
                      disabled={!testPhone || testWAMut.isPending}
                    >
                      {testWAMut.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        : <Send className="h-3.5 w-3.5 mr-1" />}
                      Send test
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The recipient must have previously messaged your WhatsApp Business number (24h window rule).
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveWAMut.mutate()}
                disabled={saveWAMut.isPending}
              >
                {saveWAMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save WhatsApp settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Payment Reminders ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Payment Reminders</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="reminders-enabled" className="text-sm text-muted-foreground">Enable</Label>
                <Switch
                  id="reminders-enabled"
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>
            </div>
            <CardDescription>
              Automatically remind members of upcoming invoice due dates via email and/or WhatsApp.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Remind members X days before due date</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_DAYS.map((d) => (
                  <DayChip
                    key={d}
                    day={d}
                    selected={reminderDays.includes(d)}
                    onToggle={() => toggleReminderDay(d)}
                  />
                ))}
              </div>
              {reminderDays.length === 0 && (
                <p className="text-xs text-destructive">Select at least one reminder day</p>
              )}
              <p className="text-xs text-muted-foreground">
                Selected:{' '}
                {reminderDays.length === 0
                  ? 'none'
                  : reminderDays.map((d) => `${d} day${d > 1 ? 's' : ''}`).join(', ')}{' '}
                before due date
              </p>
            </div>

            {reminderEnabled && !config?.smtp.enabled && !config?.whatsapp.enabled && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <Bell className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Reminders are enabled but no channel is active. Enable SMTP or WhatsApp above.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveRemindersMut.mutate()}
                disabled={saveRemindersMut.isPending || reminderDays.length === 0}
              >
                {saveRemindersMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save reminder settings
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}
