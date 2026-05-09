import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
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
import {
  useGetSuperPlans,
  usePutSuperPlansPlanName,
  getGetSuperPlansQueryKey,
} from '@/api/generated/super-admin/super-admin';
import type { Plan } from '@/api/generated/schemas/plan';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  displayName: z.string().min(1, 'Required'),
  description: z.string().optional(),
  price: z.string().min(1, 'Required'),
  currency: z.string().length(3, 'Must be 3 chars').optional().or(z.literal('')),
  maxBranches: z.string(),
  maxMembers: z.string(),
  maxTrainers: z.string(),
  maxStorageMb: z.string(),
  maxEmailSendsPerMonth: z.string(),
  customRoles: z.boolean(),
  advancedReporting: z.boolean(),
  apiAccess: z.boolean(),
  whiteLabeling: z.boolean(),
  instalmentPlans: z.boolean(),
  discountEngine: z.boolean(),
  multiCurrency: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toQuota(v: string): number {
  const n = Number(v);
  return isNaN(n) ? -1 : n;
}

const FEATURE_FLAGS: { key: keyof FormValues & string; label: string }[] = [
  { key: 'customRoles',        label: 'Custom Roles' },
  { key: 'advancedReporting',  label: 'Advanced Reporting' },
  { key: 'apiAccess',          label: 'API Access' },
  { key: 'whiteLabeling',      label: 'White Labeling' },
  { key: 'instalmentPlans',    label: 'Instalment Plans' },
  { key: 'discountEngine',     label: 'Discount Engine' },
  { key: 'multiCurrency',      label: 'Multi Currency' },
];

// ─── EditPlanDialog ───────────────────────────────────────────────────────────

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: plan.displayName ?? '',
      description: plan.description ?? '',
      price: String(plan.price ?? 0),
      currency: plan.currency ?? 'USD',
      maxBranches: String(plan.quotas?.maxBranches ?? -1),
      maxMembers: String(plan.quotas?.maxMembers ?? -1),
      maxTrainers: String(plan.quotas?.maxTrainers ?? -1),
      maxStorageMb: String(plan.quotas?.maxStorageMb ?? -1),
      maxEmailSendsPerMonth: String(plan.quotas?.maxEmailSendsPerMonth ?? -1),
      customRoles: plan.featureFlags?.customRoles ?? false,
      advancedReporting: plan.featureFlags?.advancedReporting ?? false,
      apiAccess: plan.featureFlags?.apiAccess ?? false,
      whiteLabeling: plan.featureFlags?.whiteLabeling ?? false,
      instalmentPlans: plan.featureFlags?.instalmentPlans ?? false,
      discountEngine: plan.featureFlags?.discountEngine ?? false,
      multiCurrency: plan.featureFlags?.multiCurrency ?? false,
    },
  });

  const upsert = usePutSuperPlansPlanName({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSuperPlansQueryKey() });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to update plan', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: FormValues) {
    upsert.mutate({
      planName: plan.name as 'starter' | 'pro' | 'enterprise',
      data: {
        displayName: values.displayName,
        ...(values.description && { description: values.description }),
        price: Number(values.price),
        ...(values.currency && { currency: values.currency }),
        quotas: {
          maxBranches: toQuota(values.maxBranches),
          maxMembers: toQuota(values.maxMembers),
          maxTrainers: toQuota(values.maxTrainers),
          maxStorageMb: toQuota(values.maxStorageMb),
          maxEmailSendsPerMonth: toQuota(values.maxEmailSendsPerMonth),
        },
        featureFlags: {
          customRoles: values.customRoles,
          advancedReporting: values.advancedReporting,
          apiAccess: values.apiAccess,
          whiteLabeling: values.whiteLabeling,
          instalmentPlans: values.instalmentPlans,
          discountEngine: values.discountEngine,
          multiCurrency: values.multiCurrency,
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

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    <FormControl><Input type="number" min={0} step={0.01} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl><Input placeholder="USD" maxLength={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="Short plan description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quotas (-1 = unlimited)</p>

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
                  name={key as keyof FormValues}
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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : 'Save Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const tierColor: Record<string, string> = {
    starter:    'border-slate-300',
    pro:        'border-purple-400',
    enterprise: 'border-amber-400',
  };

  return (
    <Card className={`relative border-2 ${tierColor[plan.name ?? ''] ?? ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.displayName ?? plan.name}</CardTitle>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="mt-1">
          <span className="text-3xl font-bold">{plan.currency ?? '$'}{plan.price ?? 0}</span>
          <span className="text-muted-foreground text-sm">/month</span>
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
  const [editPlan, setEditPlan] = useState<Plan | null>(null);

  const { data, isLoading } = useGetSuperPlans({
    query: { staleTime: 1000 * 60 },
  });

  const plans: Plan[] = data?.data ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Subscription Plans"
        subtitle="Configure quotas and features for each tier"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Tenants
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
          ))}
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
    </PageShell>
  );
}
