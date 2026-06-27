import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Plus, CalendarDays, Clock,
  Users, UserCheck, CreditCard, ScanLine, BarChart3,
  Receipt, GitBranch, Wrench, Bell, Tag, Dumbbell, Smartphone, UserPlus,
  ShoppingCart, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { formatCurrency } from '@/utils/format';
import {
  useGetSuperPlans,
  usePutSuperPlansPlanName,
  usePostSuperPlans,
  getGetSuperPlansQueryKey,
} from '@/api/generated/super-admin/super-admin';
import type { Plan } from '@/api/generated/schemas/plan';

// ─── Feature Flag Config ──────────────────────────────────────────────────────

type FeatureFlagKey =
  | 'members' | 'trainers' | 'billing' | 'attendance' | 'reports'
  | 'expenses' | 'branches' | 'equipment' | 'notifications'
  | 'discounts' | 'fitPlan' | 'memberPortal' | 'walkInLeads'
  | 'pos' | 'notificationChannels';

interface FeatureFlagDef {
  key:         FeatureFlagKey;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
  category:    'core' | 'advanced' | 'portal';
}

const FEATURE_FLAGS: FeatureFlagDef[] = [
  // Core features
  { key: 'members',       label: 'Members',          description: 'Member registration & management',    icon: Users,       color: 'text-blue-500',   category: 'core'     },
  { key: 'trainers',      label: 'Trainers',          description: 'Trainer management & assignments',    icon: UserCheck,   color: 'text-violet-500', category: 'core'     },
  { key: 'billing',       label: 'Billing',           description: 'Invoices, payments & subscriptions', icon: CreditCard,  color: 'text-green-500',  category: 'core'     },
  { key: 'attendance',    label: 'Attendance',        description: 'Check-in & attendance tracking',     icon: ScanLine,    color: 'text-cyan-500',   category: 'core'     },
  { key: 'notifications', label: 'Notifications',     description: 'In-app & push notifications',        icon: Bell,        color: 'text-amber-500',  category: 'core'     },
  { key: 'memberPortal',  label: 'Member Portal',     description: 'Member self-service portal',         icon: Smartphone,  color: 'text-indigo-500', category: 'portal'   },
  { key: 'trainerPortal',       label: 'Trainer Portal',        description: 'Trainer self-service login portal',       icon: UserCheck,   color: 'text-teal-500',   category: 'portal'   },
  { key: 'branchManagerPortal', label: 'Branch Manager Portal', description: 'Branch manager dedicated portal',         icon: GitBranch,   color: 'text-violet-500', category: 'portal'   },
  // Advanced features
  { key: 'reports',       label: 'Advanced Reports',  description: 'Analytics, revenue & growth reports', icon: BarChart3,   color: 'text-rose-500',   category: 'advanced' },
  { key: 'expenses',      label: 'Expenses',          description: 'Expense tracking & analytics',       icon: Receipt,     color: 'text-orange-500', category: 'advanced' },
  { key: 'branches',      label: 'Multi-Branch',      description: 'Multiple gym locations',             icon: GitBranch,   color: 'text-teal-500',   category: 'advanced' },
  { key: 'equipment',     label: 'Equipment',         description: 'Equipment & maintenance management', icon: Wrench,      color: 'text-muted-foreground',  category: 'advanced' },
  { key: 'discounts',     label: 'Discounts',         description: 'Discount codes & promotions',        icon: Tag,         color: 'text-pink-500',   category: 'advanced' },
  { key: 'fitPlan',       label: 'FitPlan',           description: 'AI-powered personalised fitness plans', icon: Dumbbell, color: 'text-emerald-500', category: 'portal'  },
  { key: 'walkInLeads',   label: 'Walk-in Leads',     description: 'Track walk-in visitors & prospect CRM', icon: UserPlus,      color: 'text-fuchsia-500', category: 'advanced' },
  { key: 'pos',                  label: 'Point of Sale',        description: 'Product catalog, orders & receipts',       icon: ShoppingCart,  color: 'text-lime-500',    category: 'advanced' },
  { key: 'notificationChannels', label: 'Notification Channels', description: 'SMTP, WhatsApp & broadcast messaging',    icon: MessageSquare, color: 'text-sky-500',     category: 'advanced' },
];

const FEATURE_FLAG_KEYS = FEATURE_FLAGS.map((f) => f.key);

// ─── Form Schema ──────────────────────────────────────────────────────────────

const featureFlagsSchema = z.object({
  members:       z.boolean(),
  trainers:      z.boolean(),
  billing:       z.boolean(),
  attendance:    z.boolean(),
  reports:       z.boolean(),
  expenses:      z.boolean(),
  branches:      z.boolean(),
  equipment:     z.boolean(),
  notifications: z.boolean(),
  discounts:     z.boolean(),
  fitPlan:             z.boolean(),
  memberPortal:        z.boolean(),
  walkInLeads:         z.boolean(),
  trainerPortal:       z.boolean(),
  branchManagerPortal: z.boolean(),
  pos:                  z.boolean(),
  notificationChannels: z.boolean(),
});

const planFormSchema = z.object({
  displayName:           z.string().min(1, 'Required'),
  description:           z.string().optional(),
  price:                 z.string().min(1, 'Required'),
  currency:              z.string().length(3, 'Must be 3 chars').default('PKR'),
  billingCycle:          z.enum(['monthly', 'yearly']).default('monthly'),
  trialDays:             z.string().default('0'),
  maxBranches:           z.string(),
  maxMembers:            z.string(),
  maxTrainers:           z.string(),
  maxStorageMb:          z.string(),
  maxEmailSendsPerMonth: z.string(),
}).merge(featureFlagsSchema);

type PlanFormValues = z.infer<typeof planFormSchema>;

const DEFAULT_FEATURE_VALUES: z.infer<typeof featureFlagsSchema> = {
  members: true, trainers: true, billing: true, attendance: true,
  reports: false, expenses: false, branches: false, equipment: false,
  notifications: true, discounts: false, fitPlan: false, memberPortal: true,
  walkInLeads: false, trainerPortal: true, branchManagerPortal: false,
  pos: false, notificationChannels: false,
};

function toQuota(v: string): number {
  const n = Number(v);
  return isNaN(n) ? -1 : n;
}

function buildFeatureFlags(values: PlanFormValues) {
  return {
    members:       values.members,
    trainers:      values.trainers,
    billing:       values.billing,
    attendance:    values.attendance,
    reports:       values.reports,
    expenses:      values.expenses,
    branches:      values.branches,
    equipment:     values.equipment,
    notifications: values.notifications,
    discounts:     values.discounts,
    fitPlan:       values.fitPlan,
    memberPortal:        values.memberPortal,
    walkInLeads:         values.walkInLeads,
    trainerPortal:       values.trainerPortal,
    branchManagerPortal: values.branchManagerPortal,
    pos:                  values.pos,
    notificationChannels: values.notificationChannels,
  };
}

function extractFeatureFlags(plan: Plan): z.infer<typeof featureFlagsSchema> {
  const ff = plan.featureFlags as Record<string, boolean> | undefined;
  return {
    members:       ff?.members       ?? true,
    trainers:      ff?.trainers      ?? true,
    billing:       ff?.billing       ?? true,
    attendance:    ff?.attendance    ?? true,
    reports:       ff?.reports       ?? false,
    expenses:      ff?.expenses      ?? false,
    branches:      ff?.branches      ?? false,
    equipment:     ff?.equipment     ?? false,
    notifications: ff?.notifications ?? true,
    discounts:     ff?.discounts     ?? false,
    fitPlan:       ff?.fitPlan       ?? false,
    memberPortal:        ff?.memberPortal        ?? true,
    walkInLeads:         ff?.walkInLeads         ?? false,
    trainerPortal:       ff?.trainerPortal       ?? true,
    branchManagerPortal: ff?.branchManagerPortal ?? false,
    pos:                  ff?.pos                  ?? false,
    notificationChannels: ff?.notificationChannels ?? false,
  };
}

const PLAN_NAMES = ['starter', 'pro', 'enterprise'] as const;
type PlanName = (typeof PLAN_NAMES)[number];

// ─── Feature Flag Section ─────────────────────────────────────────────────────

function FeatureFlagFields({ form }: { form: ReturnType<typeof useForm<PlanFormValues>> }) {
  const categories: { key: 'core' | 'advanced' | 'portal'; label: string }[] = [
    { key: 'core',     label: 'Core Features' },
    { key: 'advanced', label: 'Advanced Features' },
    { key: 'portal',   label: 'Portal & AI' },
  ];

  return (
    <div className="space-y-4">
      {categories.map(({ key, label }) => {
        const flags = FEATURE_FLAGS.filter((f) => f.category === key);
        return (
          <div key={key}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {label}
            </p>
            <div className="space-y-1.5">
              {flags.map(({ key: flagKey, label: flagLabel, description, icon: Icon, color }) => (
                <FormField
                  key={flagKey}
                  control={form.control}
                  name={flagKey}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                        <div className="min-w-0">
                          <FormLabel className="text-sm font-medium cursor-pointer leading-none">
                            {flagLabel}
                          </FormLabel>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                          className="flex-shrink-0"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Plan Form Fields ──────────────────────────────────────────────────

function PlanFormFields({ form }: { form: ReturnType<typeof useForm<PlanFormValues>> }) {
  return (
    <>
      {/* Display Name + Price row */}
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="displayName" render={({ field }) => (
          <FormItem>
            <FormLabel>Display Name *</FormLabel>
            <FormControl><Input placeholder="e.g. Pro Plan" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="price" render={({ field }) => (
          <FormItem>
            <FormLabel>Price *</FormLabel>
            <FormControl><Input type="number" min={0} step={1} placeholder="e.g. 12999" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Currency + Billing Cycle + Trial Days row */}
      <div className="grid grid-cols-3 gap-3">
        <FormField control={form.control} name="currency" render={({ field }) => (
          <FormItem>
            <FormLabel>Currency</FormLabel>
            <FormControl><Input placeholder="PKR" maxLength={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="billingCycle" render={({ field }) => (
          <FormItem>
            <FormLabel>Billing Cycle</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="trialDays" render={({ field }) => (
          <FormItem>
            <FormLabel>Trial Days</FormLabel>
            <FormControl><Input type="number" min={0} max={90} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Description */}
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl><Input placeholder="Short plan description" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quotas <span className="font-normal normal-case">(use -1 for unlimited)</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'maxBranches' as const,           label: 'Max Branches' },
          { name: 'maxMembers' as const,            label: 'Max Members' },
          { name: 'maxTrainers' as const,           label: 'Max Trainers' },
          { name: 'maxStorageMb' as const,          label: 'Storage (MB)' },
          { name: 'maxEmailSendsPerMonth' as const, label: 'Emails / Month' },
        ].map(({ name, label }) => (
          <FormField key={name} control={form.control} name={name} render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={-1}
                  {...field}
                  value={String(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}
      </div>

      <Separator />
      <FeatureFlagFields form={form} />
    </>
  );
}

// ─── Edit Plan Dialog ─────────────────────────────────────────────────────────

function EditPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const planAny = plan as Plan & { trialDays?: number; billingCycle?: string };

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      displayName:           plan.displayName ?? '',
      description:           plan.description ?? '',
      price:                 String(plan.price ?? 0),
      currency:              plan.currency ?? 'PKR',
      billingCycle:          (planAny.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
      trialDays:             String(planAny.trialDays ?? 0),
      maxBranches:           String(plan.quotas?.maxBranches ?? -1),
      maxMembers:            String(plan.quotas?.maxMembers ?? -1),
      maxTrainers:           String(plan.quotas?.maxTrainers ?? -1),
      maxStorageMb:          String(plan.quotas?.maxStorageMb ?? -1),
      maxEmailSendsPerMonth: String(plan.quotas?.maxEmailSendsPerMonth ?? -1),
      ...extractFeatureFlags(plan),
    },
  });

  const upsert = usePutSuperPlansPlanName({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetSuperPlansQueryKey() });
        toast({ title: 'Plan updated', description: `"${plan.displayName ?? plan.name}" saved successfully.` });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to update plan', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: PlanFormValues) {
    upsert.mutate({
      planName: plan.name as PlanName,
      data: {
        displayName:  values.displayName,
        description:  values.description || undefined,
        price:        Number(values.price),
        currency:     values.currency,
        billingCycle: values.billingCycle,
        trialDays:    Number(values.trialDays),
        quotas: {
          maxBranches:           toQuota(values.maxBranches),
          maxMembers:            toQuota(values.maxMembers),
          maxTrainers:           toQuota(values.maxTrainers),
          maxStorageMb:          toQuota(values.maxStorageMb),
          maxEmailSendsPerMonth: toQuota(values.maxEmailSendsPerMonth),
        },
        featureFlags: buildFeatureFlags(values),
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {plan.displayName ?? plan.name} Plan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PlanFormFields form={form} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Plan Dialog ───────────────────────────────────────────────────────

function CreatePlanDialog({
  open,
  onOpenChange,
  existingPlanNames,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingPlanNames: string[];
}) {
  const qc = useQueryClient();
  const availableNames = PLAN_NAMES.filter((n) => !existingPlanNames.includes(n));

  const createSchema = planFormSchema.extend({
    name: z.enum(PLAN_NAMES, { required_error: 'Plan name is required' }),
  });
  type CreateFormValues = z.infer<typeof createSchema>;

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name:                  availableNames[0] ?? 'starter',
      displayName:           '',
      description:           '',
      price:                 '0',
      currency:              'PKR',
      billingCycle:          'monthly',
      trialDays:             '0',
      maxBranches:           '-1',
      maxMembers:            '-1',
      maxTrainers:           '-1',
      maxStorageMb:          '-1',
      maxEmailSendsPerMonth: '-1',
      ...DEFAULT_FEATURE_VALUES,
    },
  });

  const create = usePostSuperPlans({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetSuperPlansQueryKey() });
        toast({ title: 'Plan created', description: 'New plan is now available for tenants.' });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to create plan', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: CreateFormValues) {
    create.mutate({
      data: {
        name:         values.name,
        displayName:  values.displayName,
        description:  values.description || undefined,
        price:        Number(values.price),
        currency:     values.currency,
        billingCycle: values.billingCycle,
        trialDays:    Number(values.trialDays),
        quotas: {
          maxBranches:           toQuota(values.maxBranches),
          maxMembers:            toQuota(values.maxMembers),
          maxTrainers:           toQuota(values.maxTrainers),
          maxStorageMb:          toQuota(values.maxStorageMb),
          maxEmailSendsPerMonth: toQuota(values.maxEmailSendsPerMonth),
        },
        featureFlags: buildFeatureFlags(values),
      },
    });
  }

  if (availableNames.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>All Plans Exist</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            All three plan tiers (Starter, Pro, Enterprise) have already been created.
            Use the edit button on each plan card to update them.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Plan tier selector */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Plan Tier *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableNames.map((n) => (
                      <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <PlanFormFields form={form as ReturnType<typeof useForm<PlanFormValues>>} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const tierStyles: Record<string, { border: string; badge: string; accent: string }> = {
    starter:    { border: 'border-border',   badge: 'bg-muted text-muted-foreground',   accent: 'text-muted-foreground' },
    pro:        { border: 'border-purple-400',  badge: 'bg-purple-500/15 text-purple-500', accent: 'text-purple-500' },
    enterprise: { border: 'border-amber-400',   badge: 'bg-amber-500/15 text-amber-500',   accent: 'text-amber-500' },
  };

  const planAny    = plan as Plan & { trialDays?: number; billingCycle?: string };
  const currency   = plan.currency ?? 'PKR';
  const billing    = planAny.billingCycle ?? 'monthly';
  const trialDays  = planAny.trialDays ?? 0;
  const styles     = tierStyles[plan.name ?? ''] ?? tierStyles['starter'];
  const flags      = plan.featureFlags as Record<string, boolean> | undefined ?? {};

  const enabledFlags  = FEATURE_FLAGS.filter((f) => flags[f.key]);
  const disabledFlags = FEATURE_FLAGS.filter((f) => !flags[f.key]);

  return (
    <Card className={`relative border-2 ${styles.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg capitalize">{plan.displayName ?? plan.name}</CardTitle>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles.badge}`}>
                {plan.name}
              </span>
            </div>
            {plan.description && (
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Price */}
        <div className="mt-2">
          <span className={`text-3xl font-bold ${styles.accent}`}>{formatCurrency(plan.price ?? 0, currency)}</span>
          <span className="text-muted-foreground text-sm">/{billing}</span>
        </div>

        {/* Trial + billing badges */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {trialDays > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {trialDays}-day trial
            </Badge>
          )}
          <Badge variant="outline" className="text-xs gap-1 capitalize">
            <CalendarDays className="h-3 w-3" />
            {billing}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quotas */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quotas</p>
          {[
            { label: 'Branches',     val: plan.quotas?.maxBranches },
            { label: 'Members',      val: plan.quotas?.maxMembers },
            { label: 'Trainers',     val: plan.quotas?.maxTrainers },
            { label: 'Storage',      val: plan.quotas?.maxStorageMb, unit: 'MB' },
            { label: 'Emails/month', val: plan.quotas?.maxEmailSendsPerMonth },
          ].map(({ label, val, unit }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">
                {val === -1 ? '∞' : `${val ?? '—'}${unit ? ' ' + unit : ''}`}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Feature flags — enabled */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Features <span className="font-normal normal-case">({enabledFlags.length}/{FEATURE_FLAGS.length})</span>
          </p>
          <div className="space-y-1">
            {enabledFlags.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                <span className="font-medium">{label}</span>
              </div>
            ))}
            {disabledFlags.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-2 text-sm opacity-35 line-through">
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PlansPage ────────────────────────────────────────────────────────────────

// Keep FEATURE_FLAG_KEYS referenced so tree-shaking doesn't warn
void FEATURE_FLAG_KEYS;

export default function PlansPage() {
  const navigate = useNavigate();
  const [editPlan, setEditPlan]     = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useGetSuperPlans({
    query: { staleTime: 1000 * 60 },
  });

  const plans: Plan[] = data?.data ?? [];
  const existingNames = plans.map((p) => p.name ?? '').filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        title="Subscription Plans"
        subtitle="Configure quotas, pricing, and features for each tier"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/super-admin')}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Plan
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[500px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            No plans have been created yet. Create your first plan to get started.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id ?? plan.name}
              plan={plan}
              onEdit={() => setEditPlan(plan)}
            />
          ))}
        </div>
      )}

      {editPlan && (
        <EditPlanDialog
          plan={editPlan}
          open={!!editPlan}
          onOpenChange={(v) => { if (!v) setEditPlan(null); }}
        />
      )}

      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingPlanNames={existingNames}
      />
    </PageShell>
  );
}
