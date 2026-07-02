import { useState } from 'react';
import {
  Zap, Plus, Pencil, Trash2, Play, Pause, CheckCircle2,
  Mail, MessageSquare, Clock, RotateCcw, Cake, AlertTriangle,
  UserX, Loader2, ChevronDown, ChevronRight, Send,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button }   from '@/components/ui/button';
import { Badge }    from '@/components/ui/badge';
import { Switch }   from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';
import PageShell    from '@/components/layout/PageShell';
import PageHeader   from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { api }      from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignType    = 'reengagement' | 'expiry_warning' | 'winback' | 'birthday';
type CampaignStatus  = 'active' | 'paused' | 'draft';
type CampaignChannel = 'email' | 'whatsapp';

interface Campaign {
  _id:             string;
  name:            string;
  type:            CampaignType;
  status:          CampaignStatus;
  channels:        CampaignChannel[];
  triggerDays:     number;
  messageTemplate: string;
  emailSubject?:   string;
  cooldownDays:    number;
  totalSent:       number;
  totalFailed:     number;
  lastRunAt?:      string;
  createdAt:       string;
}

interface CampaignLog {
  _id:         string;
  memberName:  string;
  memberEmail: string;
  memberPhone: string;
  channel:     CampaignChannel;
  status:      'sent' | 'failed';
  sentAt:      string;
  error?:      string;
}

// ─── Campaign type metadata ───────────────────────────────────────────────────

const TYPE_META: Record<CampaignType, { label: string; icon: React.ElementType; color: string; description: string; triggerLabel: string }> = {
  reengagement:  {
    label: 'Re-engagement',
    icon: UserX,
    color: 'text-orange-600',
    description: 'Reach members who haven\'t checked in recently',
    triggerLabel: 'days since last check-in',
  },
  expiry_warning: {
    label: 'Expiry Warning',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    description: 'Remind members before their subscription expires',
    triggerLabel: 'days before expiry',
  },
  winback: {
    label: 'Win-back',
    icon: RotateCcw,
    color: 'text-red-600',
    description: 'Bring back members whose membership has lapsed',
    triggerLabel: 'days after subscription ended',
  },
  birthday: {
    label: 'Birthday',
    icon: Cake,
    color: 'text-pink-600',
    description: 'Auto-send birthday wishes on members\' birthdays',
    triggerLabel: 'N/A (runs on birthday)',
  },
};

const TEMPLATE_VARIABLES = [
  { key: '{{firstName}}',    desc: 'Member\'s first name' },
  { key: '{{lastName}}',     desc: 'Member\'s last name' },
  { key: '{{gymName}}',      desc: 'Your gym name' },
  { key: '{{daysInactive}}', desc: 'Days since last check-in (re-engagement only)' },
  { key: '{{daysLeft}}',     desc: 'Days until expiry (expiry warning only)' },
  { key: '{{planName}}',     desc: 'Subscription plan name' },
];

// ─── API hooks ────────────────────────────────────────────────────────────────

function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn:  async () => {
      const res = await api.get<{ data: Campaign[] }>('/campaigns');
      return res.data.data ?? [];
    },
  });
}

function useCampaignLogs(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'logs'],
    queryFn:  async () => {
      const res = await api.get<{ data: CampaignLog[] }>(`/campaigns/${campaignId}/logs?limit=20`);
      return res.data.data ?? [];
    },
    enabled: !!campaignId,
  });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-primary/10 p-5 mb-4">
        <Zap className="h-10 w-10 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No campaigns yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Create your first automated campaign to re-engage inactive members, send expiry reminders, or wish members a happy birthday.
      </p>
      <Button onClick={onCreate} className="gap-2">
        <Plus className="h-4 w-4" /> Create First Campaign
      </Button>
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onToggle,
  onRun,
  onViewLogs,
  isRunning,
}: {
  campaign: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (status: CampaignStatus) => void;
  onRun: () => void;
  onViewLogs: () => void;
  isRunning: boolean;
}) {
  const meta = TYPE_META[campaign.type];
  const Icon = meta.icon;
  const isActive = campaign.status === 'active';

  return (
    <Card className={`transition-all ${isActive ? 'border-primary/30' : 'opacity-80'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: icon + info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`rounded-lg p-2 bg-muted shrink-0`}>
              <Icon className={`h-5 w-5 ${meta.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{campaign.name}</h3>
                <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.label} · {meta.description}</p>

              {/* Channels */}
              <div className="flex items-center gap-2 mt-2">
                {campaign.channels.includes('email') && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                    <Mail className="h-3 w-3" /> Email
                  </span>
                )}
                {campaign.channels.includes('whatsapp') && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </span>
                )}
              </div>

              {/* Trigger + stats */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {campaign.type !== 'birthday' && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Trigger: {campaign.triggerDays} {meta.triggerLabel}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {campaign.totalSent} sent
                </span>
                {campaign.lastRunAt && (
                  <span>Last run: {new Date(campaign.lastRunAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: toggle + actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <Switch
              checked={isActive}
              onCheckedChange={checked => onToggle(checked ? 'active' : 'paused')}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Run now"
                onClick={onRun}
                disabled={isRunning}
              >
                {isRunning
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Play className="h-3.5 w-3.5" />
                }
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onViewLogs} title="View logs">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create/Edit Sheet ────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<CampaignType, string> = {
  reengagement: `Hi {{firstName}},\n\nWe miss you at {{gymName}}! 💪\n\nIt's been {{daysInactive}} days since your last visit. Your fitness journey is important to us.\n\nCome back and let's crush those goals together!\n\nSee you soon,\n{{gymName}} Team`,
  expiry_warning: `Hi {{firstName}},\n\nYour {{planName}} membership at {{gymName}} expires in {{daysLeft}} days.\n\nDon't let your fitness progress stop! Renew your membership today to keep enjoying unlimited access.\n\nContact us to renew: reply to this message or visit the front desk.\n\n{{gymName}} Team`,
  winback: `Hi {{firstName}},\n\nWe noticed your {{planName}} membership at {{gymName}} has ended.\n\nWe'd love to have you back! Reply to this message or visit us to rejoin and continue your fitness journey.\n\n{{gymName}} Team`,
  birthday: `Happy Birthday {{firstName}}! 🎂🎉\n\nWishing you a wonderful birthday from all of us at {{gymName}}!\n\nThank you for being a valued member of our fitness family. We hope this year brings you great health and happiness!\n\n{{gymName}} Team`,
};

interface FormState {
  name:            string;
  type:            CampaignType;
  status:          CampaignStatus;
  channels:        CampaignChannel[];
  triggerDays:     string;
  messageTemplate: string;
  emailSubject:    string;
  cooldownDays:    string;
}

function CampaignSheet({
  open,
  onOpenChange,
  campaign,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaign?: Campaign;
  onSave: (data: Partial<FormState>) => void;
  isSaving: boolean;
}) {
  const isEdit = !!campaign;
  const [form, setForm] = useState<FormState>(() => ({
    name:            campaign?.name            ?? '',
    type:            campaign?.type            ?? 'reengagement',
    status:          campaign?.status          ?? 'active',
    channels:        campaign?.channels        ?? ['whatsapp'],
    triggerDays:     String(campaign?.triggerDays  ?? 7),
    messageTemplate: campaign?.messageTemplate ?? DEFAULT_TEMPLATES.reengagement,
    emailSubject:    campaign?.emailSubject    ?? '',
    cooldownDays:    String(campaign?.cooldownDays ?? 30),
  }));
  const [showVars, setShowVars] = useState(false);

  // When type changes, load the default template if field is still empty/default
  function handleTypeChange(type: CampaignType) {
    setForm(f => ({
      ...f,
      type,
      messageTemplate: DEFAULT_TEMPLATES[type],
      triggerDays: type === 'birthday' ? '0' : f.triggerDays,
    }));
  }

  function toggleChannel(ch: CampaignChannel) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch],
    }));
  }

  const useEmail = form.channels.includes('email');

  const TYPE_COLORS: Record<CampaignType, { bg: string; border: string; icon: string; ring: string }> = {
    reengagement:   { bg: 'bg-orange-50 dark:bg-orange-950/30',  border: 'border-orange-400',  icon: 'text-orange-500',  ring: 'ring-orange-500/20'  },
    expiry_warning: { bg: 'bg-yellow-50 dark:bg-yellow-950/30',  border: 'border-yellow-400',  icon: 'text-yellow-500',  ring: 'ring-yellow-500/20'  },
    winback:        { bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-400',     icon: 'text-red-500',     ring: 'ring-red-500/20'     },
    birthday:       { bg: 'bg-pink-50 dark:bg-pink-950/30',       border: 'border-pink-400',    icon: 'text-pink-500',    ring: 'ring-pink-500/20'    },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">

        {/* Header */}
        <div className="px-6 py-5 border-b">
          <SheetTitle className="text-lg">{isEdit ? 'Edit Campaign' : 'New Campaign'}</SheetTitle>
          <SheetDescription className="text-sm mt-0.5">
            {isEdit ? 'Update the campaign settings below.' : 'Set up an automated campaign to reach your members.'}
          </SheetDescription>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Campaign Name ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Campaign Name</Label>
            <Input
              placeholder="e.g. 7-Day Inactive Re-engagement"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="h-10"
            />
          </div>

          {/* ── Campaign Type ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Campaign Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_META) as [CampaignType, typeof TYPE_META[CampaignType]][]).map(([type, meta]) => {
                const Icon = meta.icon;
                const selected = form.type === type;
                const colors = TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
                        : 'border-border hover:border-muted-foreground/40 bg-muted/30'
                    }`}
                  >
                    <div className={`rounded-lg p-1.5 w-fit ${selected ? colors.bg : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${selected ? colors.icon : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-sm font-semibold leading-tight ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight line-clamp-2">{meta.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Timing ── */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timing</p>
            <div className={`grid gap-4 ${form.type !== 'birthday' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {form.type !== 'birthday' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Trigger After</Label>
                  <div className="relative">
                    <Input
                      type="number" min={1}
                      value={form.triggerDays}
                      onChange={e => setForm(f => ({ ...f, triggerDays: e.target.value }))}
                      className="h-10 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{TYPE_META[form.type].triggerLabel}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cooldown Period</Label>
                <div className="relative">
                  <Input
                    type="number" min={1}
                    value={form.cooldownDays}
                    onChange={e => setForm(f => ({ ...f, cooldownDays: e.target.value }))}
                    className="h-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">days</span>
                </div>
                <p className="text-xs text-muted-foreground">Between sends to same member</p>
              </div>
            </div>
          </div>

          {/* ── Delivery Channels ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Send Via</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  useEmail
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
                {useEmail && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
              </button>
              <button
                type="button"
                onClick={() => toggleChannel('whatsapp')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.channels.includes('whatsapp')
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 ring-2 ring-green-500/20'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
                {form.channels.includes('whatsapp') && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
              </button>
            </div>
          </div>

          {/* ── Email Subject (conditional) ── */}
          {useEmail && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Subject</Label>
              <Input
                placeholder="e.g. We miss you at {{gymName}}!"
                value={form.emailSubject}
                onChange={e => setForm(f => ({ ...f, emailSubject: e.target.value }))}
                className="h-10"
              />
            </div>
          )}

          {/* ── Message Template ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Message Template</Label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                onClick={() => setShowVars(v => !v)}
              >
                {showVars ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Variables
              </button>
            </div>

            {showVars && (
              <div className="rounded-xl border bg-muted/40 p-3 grid grid-cols-1 gap-1.5">
                {TEMPLATE_VARIABLES.map(v => (
                  <div key={v.key} className="flex items-center gap-2 text-xs">
                    <code className="bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded shrink-0">{v.key}</code>
                    <span className="text-muted-foreground">{v.desc}</span>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              rows={7}
              placeholder="Write your message. Use {{firstName}}, {{gymName}}, etc."
              value={form.messageTemplate}
              onChange={e => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
              className="font-mono text-sm resize-none leading-relaxed"
            />
          </div>

          {/* ── Activate Toggle ── */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3.5">
            <div>
              <p className="text-sm font-medium">Activate immediately</p>
              <p className="text-xs text-muted-foreground mt-0.5">Starts on the next hourly cycle</p>
            </div>
            <Switch
              checked={form.status === 'active'}
              onCheckedChange={checked => setForm(f => ({ ...f, status: checked ? 'active' : 'draft' }))}
            />
          </div>

        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 px-6 py-4 border-t bg-background">
          <Button
            className="w-full h-11 gap-2 text-sm font-semibold"
            disabled={isSaving || !form.name.trim() || form.channels.length === 0 || !form.messageTemplate.trim()}
            onClick={() => onSave(form)}
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Campaign'}</>
            }
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}

// ─── Logs Sheet ───────────────────────────────────────────────────────────────

function LogsSheet({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: logs = [], isLoading } = useCampaignLogs(open && campaign ? campaign._id : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Send History</SheetTitle>
          <SheetDescription>{campaign?.name}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3 animate-pulse">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No messages sent yet. Activate the campaign to start sending.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log._id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{log.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.channel === 'email' ? log.memberEmail : log.memberPhone}
                  </p>
                  {log.error && <p className="text-xs text-red-500 mt-0.5">{log.error}</p>}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={log.status === 'sent' ? 'outline' : 'destructive'} className="text-xs capitalize">
                    {log.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.sentAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.channel === 'email' ? '✉️' : '💬'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { toast }   = useToast();
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading } = useCampaigns();

  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [logsOpen,     setLogsOpen]     = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [editing,      setEditing]      = useState<Campaign | undefined>();
  const [logsTarget,   setLogsTarget]   = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [runningId,    setRunningId]    = useState<string | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(form: Partial<FormState>) {
    if (!form.channels?.length) {
      toast({ title: 'Select at least one channel', variant: 'destructive' }); return;
    }
    if (form.channels.includes('email') && !form.emailSubject?.trim()) {
      toast({ title: 'Email subject is required', variant: 'destructive' }); return;
    }
    setIsSaving(true);
    const payload = {
      ...form,
      triggerDays:  Number(form.triggerDays)  || 7,
      cooldownDays: Number(form.cooldownDays) || 30,
    };
    try {
      if (editing) {
        await api.patch(`/campaigns/${editing._id}`, payload);
        toast({ title: 'Campaign updated' });
      } else {
        await api.post('/campaigns', payload);
        toast({ title: 'Campaign created' });
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSheetOpen(false);
      setEditing(undefined);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(campaign: Campaign, status: CampaignStatus) {
    try {
      await api.patch(`/campaigns/${campaign._id}/status`, { status });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: `Campaign ${status}` });
    } catch {
      toast({ title: 'Could not update status', variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/campaigns/${deleteTarget._id}`);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign deleted' });
    } catch {
      toast({ title: 'Could not delete campaign', variant: 'destructive' });
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }

  async function handleRunNow(campaign: Campaign) {
    setRunningId(campaign._id);
    try {
      const res = await api.post<{ data: { sent: number; failed: number; skipped: number } }>(`/campaigns/${campaign._id}/run`);
      const { sent, failed, skipped } = res.data.data;
      toast({ title: `Campaign ran: ${sent} sent, ${failed} failed, ${skipped} skipped` });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Run failed';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setRunningId(null);
    }
  }

  // ─── Group campaigns by type ──────────────────────────────────────────────
  const active  = campaigns.filter(c => c.status === 'active');
  const paused  = campaigns.filter(c => c.status !== 'active');

  return (
    <PageShell>
      <PageHeader
        title="Automated Campaigns"
        subtitle="Set up campaigns that run automatically to re-engage, remind, and retain members"
        actions={
          <Button className="gap-2" onClick={() => { setEditing(undefined); setSheetOpen(true); }}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {/* Stats strip skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2 animate-pulse">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
            ))}
          </div>
          {/* Campaign card skeletons */}
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState onCreate={() => { setEditing(undefined); setSheetOpen(true); }} />
      ) : (
        <div className="space-y-8">
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{active.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{campaigns.reduce((s, c) => s + c.totalSent, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Messages Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{paused.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Paused / Draft</p>
              </CardContent>
            </Card>
          </div>

          {/* Active campaigns */}
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Active
              </h2>
              <div className="space-y-3">
                {active.map(c => (
                  <CampaignCard
                    key={c._id}
                    campaign={c}
                    onEdit={() => { setEditing(c); setSheetOpen(true); }}
                    onDelete={() => { setDeleteTarget(c); setDeleteOpen(true); }}
                    onToggle={status => handleToggle(c, status)}
                    onRun={() => handleRunNow(c)}
                    onViewLogs={() => { setLogsTarget(c); setLogsOpen(true); }}
                    isRunning={runningId === c._id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Paused / draft campaigns */}
          {paused.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Pause className="h-3.5 w-3.5" /> Paused / Draft
              </h2>
              <div className="space-y-3">
                {paused.map(c => (
                  <CampaignCard
                    key={c._id}
                    campaign={c}
                    onEdit={() => { setEditing(c); setSheetOpen(true); }}
                    onDelete={() => { setDeleteTarget(c); setDeleteOpen(true); }}
                    onToggle={status => handleToggle(c, status)}
                    onRun={() => handleRunNow(c)}
                    onViewLogs={() => { setLogsTarget(c); setLogsOpen(true); }}
                    isRunning={runningId === c._id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <CampaignSheet
        open={sheetOpen}
        onOpenChange={o => { setSheetOpen(o); if (!o) setEditing(undefined); }}
        campaign={editing}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Logs Sheet */}
      <LogsSheet campaign={logsTarget} open={logsOpen} onOpenChange={setLogsOpen} />

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its send history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
