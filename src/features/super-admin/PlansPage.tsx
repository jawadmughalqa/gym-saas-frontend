import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, CalendarDays, Clock } from 'lucide-react';
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

// ─── Form Schema ──────────────────────────────────────────────────────────────

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
  customRoles:           z.boolean(),
  advancedReporting:     z.boolean(),
  apiAccess:             z.boolean(),
  whiteLabeling:         z.boolean(),
  instalmentPlans:       z.boolean(),
  discountEngine:        z.boolean(),
  multiCurrency:         z.boolean(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

function toQuota(v: string): number {
  const n = Number(v);
  return isNaN(n) ? -1 : n;
}

const FEATURE_FLAGS: { key: keyof PlanFormValues & string; label: string }[] = [
  { key: 'customRoles',        label: 'Custom Roles' },
  { key: 'advancedReporting',  label: 'Advanced Reporting' },
  { key: 'apiAccess',          label: 'API Access' },
  { key: 'whiteLabeling',      label: 'White Labeling' },
  { key: 'instalmentPlans',    label: 'Instalment Plans' },
  { key: 'discountEngine',     label: 'Discount Engine' },
  { key: 'multiCurrency',      label: 'Multi Currency' },
];

const PLAN_NAMES = ['starter', 'pro', 'enterprise'] as const;
type PlanName = (typeof PLAN_NAMES)[number];

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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feature Flags</p>

      <div className="space-y-2">
        {FEATURE_FLAGS.map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={key as keyof PlanFormValues}
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded border px-3 py-2">
                <FormLabel className="text-sm cursor-pointer">{label}</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </div>
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

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      displayName:           plan.displayName ?? '',
      description:           plan.description ?? '',
      price:                 String(plan.price ?? 0),
      currency:              plan.currency ?? 'PKR',
      billingCycle:          (plan.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
      trialDays:             String((plan as Plan & { trialDays?: number }).trialDays ?? 0),
      maxBranches:           String(plan.quotas?.maxBranches ?? -1),
      maxMembers:            String(plan.quotas?.maxMembers ?? -1),
      maxTrainers:           String(plan.quotas?.maxTrainers ?? -1),
      maxStorageMb:          String(plan.quotas?.maxStorageMb ?? -1),
      maxEmailSendsPerMonth: String(plan.quotas?.maxEmailSendsPerMonth ?? -1),
      customRoles:           plan.featureFlags?.customRoles ?? false,
      advancedReporting:     plan.featureFlags?.advancedReporting ?? false,
      apiAccess:             plan.featureFlags?.apiAccess ?? false,
      whiteLabeling:         plan.featureFlags?.whiteLabeling ?? false,
      instalmentPlans:       plan.featureFlags?.instalmentPlans ?? false,
      discountEngine:        plan.featureFlags?.discountEngine ?? false,
      multiCurrency:         plan.featureFlags?.multiCurrency ?? false,
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
        featureFlags: {
          customRoles:       values.customRoles,
          advancedReporting: values.advancedReporting,
          apiAccess:         values.apiAccess,
          whiteLabeling:     values.whiteLabeling,
          instalmentPlans:   values.instalmentPlans,
          discountEngine:    values.discountEngine,
          multiCurrency:     values.multiCurrency,
        },
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
      customRoles:           false,
      advancedReporting:     false,
      apiAccess:             false,
      whiteLabeling:         false,
      instalmentPlans:       false,
      discountEngine:        true,
      multiCurrency:         false,
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
        featureFlags: {
          customRoles:       values.customRoles,
          advancedReporting: values.advancedReporting,
          apiAccess:         values.apiAccess,
          whiteLabeling:     values.whiteLabeling,
          instalmentPlans:   values.instalmentPlans,
          discountEngine:    values.discountEngine,
          multiCurrency:     values.multiCurrency,
        },
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
  const tierBorder: Record<string, string> = {
    starter:    'border-slate-300',
    pro:        'border-purple-400',
    enterprise: 'border-amber-400',
  };

  const planAny = plan as Plan & { trialDays?: number; billingCycle?: string };
  const currency = plan.currency ?? 'PKR';
  const billingCycle = planAny.billingCycle ?? 'monthly';
  const trialDays = planAny.trialDays ?? 0;

  return (
    <Card className={`relative border-2 ${tierBorder[plan.name ?? ''] ?? ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg capitalize">{plan.displayName ?? plan.name}</CardTitle>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Price */}
        <div className="mt-2">
          <span className="text-3xl font-bold">{formatCurrency(plan.price ?? 0, currency)}</span>
          <span className="text-muted-foreground text-sm">/{billingCycle}</span>
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
            {billingCycle}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quotas */}
        <div className="space-y-1">
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
                {val === -1 ? '∞ Unlimited' : `${val ?? '—'}${unit ? ' ' + unit : ''}`}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Feature flags */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Features</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.featureFlags && Object.entries(plan.featureFlags).map(([flag, enabled]) => (
              <Badge
                key={flag}
                variant={enabled ? 'default' : 'outline'}
                className={enabled
                  ? 'bg-green-600 hover:bg-green-700 text-xs'
                  : 'text-muted-foreground text-xs line-through opacity-50'}
              >
                {flag.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PlansPage ────────────────────────────────────────────────────────────────

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
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
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
