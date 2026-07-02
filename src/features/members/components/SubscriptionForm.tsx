import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Info } from 'lucide-react';

import { Sheet, SheetContent }   from '@/components/ui/sheet';
import { Button }                from '@/components/ui/button';
import { Input }                 from '@/components/ui/input';
import { Label }                 from '@/components/ui/label';
import { Textarea }              from '@/components/ui/textarea';
import { Separator }             from '@/components/ui/separator';
import { Switch }                from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  usePostMembersMemberIdSubscriptions,
  getGetMembersMemberIdSubscriptionsQueryKey,
  getGetMembersMemberIdQueryKey,
  getGetMembersQueryKey,
} from '@/api/generated/members/members';
import { getGetInvoicesQueryKey } from '@/api/generated/invoices/invoices';
import { useGetMembershipPlans } from '@/api/generated/membership-plans/membership-plans';
import type { MembershipPlan }   from '@/api/generated/schemas';
import { useQueryClient }        from '@tanstack/react-query';
import { useToast }              from '@/hooks/use-toast';
import { useTenantCurrency }     from '@/hooks/use-tenant-currency';

// ─── Constants ────────────────────────────────────────────────────────────────

const BILLING_FREQUENCIES = [
  { value: 'daily',       label: 'Daily' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual',      label: 'Annual' },
  { value: 'one_time',    label: 'One-Time' },
] as const;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const planSchema = z.object({
  pricingType:       z.literal('plan'),
  planId:            z.string().min(1, 'Select a plan'),
  discountAmount:    z.coerce.number().min(0).default(0),
  startDate:         z.string().optional(),
  notes:             z.string().max(500).optional(),
  autoCreateInvoice: z.boolean().default(true),
});

const customSchema = z.object({
  pricingType:            z.literal('custom'),
  customLabel:            z.string().min(1, 'Label is required').max(100),
  customPrice:            z.coerce.number().min(0, 'Price cannot be negative'),
  customBillingFrequency: z.enum([
    'daily', 'weekly', 'monthly', 'quarterly',
    'semi_annual', 'annual', 'one_time',
  ]),
  currency:          z.string().length(3),
  discountAmount:    z.coerce.number().min(0).default(0),
  durationDays:      z.coerce.number().int().min(1).optional().or(z.literal('')),
  startDate:         z.string().optional(),
  notes:             z.string().max(500).optional(),
  autoCreateInvoice: z.boolean().default(true),
});

type PlanFormValues   = z.infer<typeof planSchema>;
type CustomFormValues = z.infer<typeof customSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubscriptionFormProps {
  open:            boolean;
  onOpenChange:    (open: boolean) => void;
  memberId:        string;
  defaultBranchId?: string; // passed in silently — not shown to user
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionForm({
  open,
  onOpenChange,
  memberId,
  defaultBranchId = '',
}: SubscriptionFormProps) {
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const { currency }    = useTenantCurrency();
  const [mode, setMode] = useState<'plan' | 'custom'>('plan');

  // ── Fetch active plans ────────────────────────────────────────────────────
  const { data: plansResponse, isLoading: loadingPlans } = useGetMembershipPlans(
    { includeArchived: false },
    { query: { enabled: open } },
  );
  const plans: MembershipPlan[] = plansResponse?.data ?? [];

  // ── Selected plan for price preview ──────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mutation = usePostMembersMemberIdSubscriptions({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
        });
        void queryClient.invalidateQueries({
          queryKey: getGetMembersMemberIdQueryKey(memberId),
        });
        // Invalidate the members list so plan/next-due columns update immediately
        void queryClient.invalidateQueries({
          queryKey: getGetMembersQueryKey(),
        });
        // Invalidate ALL invoice queries — BillingTab uses { memberId, limit: 100 }
        // which is a different key from { memberId }, so we invalidate the prefix to catch both
        void queryClient.invalidateQueries({
          queryKey: getGetInvoicesQueryKey(),
        });
        toast({
          title:       'Subscription assigned',
          description: 'Membership activated and invoice created.',
        });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const msg = (err as Error)?.message ?? 'Failed to assign subscription.';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      },
    },
  });

  // ── Today helper ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  // ── Plan form ─────────────────────────────────────────────────────────────
  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      pricingType:       'plan',
      planId:            '',
      discountAmount:    0,
      startDate:         today,
      notes:             '',
      autoCreateInvoice: true,
    },
  });

  // ── Custom form ───────────────────────────────────────────────────────────
  const customForm = useForm<CustomFormValues>({
    resolver: zodResolver(customSchema),
    defaultValues: {
      pricingType:            'custom',
      customLabel:            '',
      customPrice:            0,
      customBillingFrequency: 'monthly',
      currency:               currency,
      discountAmount:         0,
      durationDays:           '',
      startDate:              today,
      notes:                  '',
      autoCreateInvoice:      true,
    },
  });

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const resetDate = new Date().toISOString().slice(0, 10);
      planForm.reset({
        pricingType: 'plan', planId: '', discountAmount: 0,
        startDate: resetDate, notes: '', autoCreateInvoice: true,
      });
      customForm.reset({
        pricingType: 'custom', customLabel: '', customPrice: 0,
        customBillingFrequency: 'monthly', currency: currency,
        discountAmount: 0, durationDays: '', startDate: resetDate,
        notes: '', autoCreateInvoice: true,
      });
      setSelectedPlan(null);
      setMode('plan');
    }
  }, [open]);

  // ── Auto-select first plan once plans load ────────────────────────────────
  useEffect(() => {
    if (open && plans.length > 0 && !planForm.getValues('planId')) {
      const first = plans[0];
      planForm.setValue('planId', first._id ?? '', { shouldValidate: true });
      setSelectedPlan(first);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, open]);

  // ── Price preview ─────────────────────────────────────────────────────────
  const planDiscount    = planForm.watch('discountAmount')  ?? 0;
  const customPrice     = customForm.watch('customPrice')   ?? 0;
  const customDiscount  = customForm.watch('discountAmount') ?? 0;

  const planFinalPrice   = Math.max(0, (selectedPlan?.basePrice ?? 0) - Number(planDiscount));
  const customFinalPrice = Math.max(0, Number(customPrice) - Number(customDiscount));

  // ── Submit: plan ──────────────────────────────────────────────────────────
  const handlePlanSubmit = (values: PlanFormValues) => {
    mutation.mutate({
      memberId,
      data: {
        pricingType:       'plan',
        planId:            values.planId,
        branchId:          defaultBranchId,   // ← passed silently from parent
        discountAmount:    Number(values.discountAmount),
        startDate:         values.startDate   || undefined,
        notes:             values.notes       || undefined,
        autoCreateInvoice: values.autoCreateInvoice,
      },
    });
  };

  // ── Submit: custom ────────────────────────────────────────────────────────
  const handleCustomSubmit = (values: CustomFormValues) => {
    mutation.mutate({
      memberId,
      data: {
        pricingType:            'custom',
        branchId:               defaultBranchId,  // ← passed silently from parent
        customLabel:            values.customLabel,
        customPrice:            Number(values.customPrice),
        customBillingFrequency: values.customBillingFrequency,
        currency:               values.currency,
        discountAmount:         Number(values.discountAmount),
        durationDays:           values.durationDays && values.durationDays !== ''
                                  ? Number(values.durationDays)
                                  : undefined,
        startDate:              values.startDate || undefined,
        notes:                  values.notes    || undefined,
        autoCreateInvoice:      values.autoCreateInvoice,
      },
    });
  };

  const isPending = mutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">

        {/* Header */}
        <div className="shrink-0 bg-background border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Assign Membership</h2>
          <p className="text-sm text-muted-foreground">
            Assign a plan or set custom pricing for this member.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Mode toggle ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('plan')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === 'plan'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">Membership Plan</p>
              <p className="text-xs mt-0.5 opacity-70">Select an existing plan</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === 'custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">Custom Pricing</p>
              <p className="text-xs mt-0.5 opacity-70">Manually set member charges</p>
            </button>
          </div>

          <Separator />

          {/* ── Plan mode ────────────────────────────────────────────────── */}
          {mode === 'plan' && (
            <form id="sub-plan-form" onSubmit={planForm.handleSubmit(handlePlanSubmit)} className="space-y-4">

              {/* Plan selector */}
              <div className="space-y-1.5">
                <Label>
                  Membership Plan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={planForm.watch('planId')}
                  onValueChange={(v) => {
                    planForm.setValue('planId', v, { shouldValidate: true });
                    setSelectedPlan(plans.find((p) => p._id === v) ?? null);
                    planForm.setValue('discountAmount', 0);
                  }}
                  disabled={isPending || loadingPlans}
                >
                  <SelectTrigger
                    className={planForm.formState.errors.planId ? 'border-destructive' : ''}
                  >
                    <SelectValue
                      placeholder={loadingPlans ? 'Loading plans…' : 'Select a plan'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id ?? ''}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{plan.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {plan.currency} {plan.basePrice?.toFixed(0)} / {plan.billingFrequency}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {planForm.formState.errors.planId && (
                  <p className="text-xs text-destructive">
                    {planForm.formState.errors.planId.message}
                  </p>
                )}
              </div>

              {/* Plan details info box */}
              {selectedPlan && (
                <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Plan Details
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-medium">
                      {selectedPlan.currency} {selectedPlan.basePrice?.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-medium capitalize">
                      {selectedPlan.billingFrequency?.replace('_', ' ')}
                    </span>
                    {selectedPlan.durationDays && (
                      <>
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">{selectedPlan.durationDays} days</span>
                      </>
                    )}
                    {selectedPlan.features && selectedPlan.features.length > 0 && (
                      <>
                        <span className="text-muted-foreground">Features</span>
                        <span className="font-medium">
                          {selectedPlan.features.slice(0, 2).join(', ')}
                          {selectedPlan.features.length > 2 &&
                            ` +${selectedPlan.features.length - 2} more`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Discount */}
              {selectedPlan && (
                <div className="space-y-1.5">
                  <Label htmlFor="plan-discount">
                    Discount ({selectedPlan.currency})
                  </Label>
                  <Input
                    id="plan-discount"
                    type="number"
                    min={0}
                    max={selectedPlan.basePrice}
                    step={0.01}
                    placeholder="0"
                    disabled={isPending}
                    {...planForm.register('discountAmount')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional one-off discount for this member.
                  </p>
                </div>
              )}

              {/* Final price */}
              {selectedPlan && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Final Amount</span>
                  <span className="text-lg font-bold text-primary">
                    {selectedPlan.currency} {planFinalPrice.toFixed(2)}
                  </span>
                </div>
              )}

              <Separator />

              {/* Start date + Notes */}
              <CommonFields
                register={planForm.register}
                isPending={isPending}
                startDateValue={planForm.watch('startDate') ?? ''}
                onStartDateChange={(v) => planForm.setValue('startDate', v ?? '')}
              />

              {/* Auto invoice */}
              <AutoInvoiceToggle
                checked={planForm.watch('autoCreateInvoice')}
                onChange={(v) => planForm.setValue('autoCreateInvoice', v)}
                disabled={isPending}
              />

            </form>
          )}

          {/* ── Custom mode ──────────────────────────────────────────────── */}
          {mode === 'custom' && (
            <form id="sub-custom-form" onSubmit={customForm.handleSubmit(handleCustomSubmit)} className="space-y-4">

              {/* Label */}
              <div className="space-y-1.5">
                <Label htmlFor="customLabel">
                  Arrangement Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customLabel"
                  placeholder="e.g. Monthly Deal, Special Rate"
                  disabled={isPending}
                  className={
                    customForm.formState.errors.customLabel ? 'border-destructive' : ''
                  }
                  {...customForm.register('customLabel')}
                />
                {customForm.formState.errors.customLabel && (
                  <p className="text-xs text-destructive">
                    {customForm.formState.errors.customLabel.message}
                  </p>
                )}
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="customPrice">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customPrice"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    disabled={isPending}
                    className={
                      customForm.formState.errors.customPrice ? 'border-destructive' : ''
                    }
                    {...customForm.register('customPrice')}
                  />
                  {customForm.formState.errors.customPrice && (
                    <p className="text-xs text-destructive">
                      {customForm.formState.errors.customPrice.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    placeholder={currency}
                    maxLength={3}
                    disabled={isPending}
                    {...customForm.register('currency')}
                  />
                </div>
              </div>

              {/* Frequency + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Billing Frequency <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={customForm.watch('customBillingFrequency')}
                    onValueChange={(v) =>
                      customForm.setValue(
                        'customBillingFrequency',
                        v as CustomFormValues['customBillingFrequency'],
                      )
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="durationDays">Duration (days)</Label>
                  <Input
                    id="durationDays"
                    type="number"
                    min={1}
                    placeholder="Empty = ongoing"
                    disabled={isPending}
                    {...customForm.register('durationDays')}
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label htmlFor="custom-discount">Discount</Label>
                <Input
                  id="custom-discount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  disabled={isPending}
                  {...customForm.register('discountAmount')}
                />
              </div>

              {/* Final price */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">Final Amount</span>
                <span className="text-lg font-bold text-primary">
                  {customForm.watch('currency') || currency} {customFinalPrice.toFixed(2)}
                </span>
              </div>

              <Separator />

              {/* Start date + Notes */}
              <CommonFields
                register={customForm.register}
                isPending={isPending}
                startDateValue={customForm.watch('startDate') ?? ''}
                onStartDateChange={(v) => customForm.setValue('startDate', v ?? '')}
              />

              {/* Auto invoice */}
              <AutoInvoiceToggle
                checked={customForm.watch('autoCreateInvoice')}
                onChange={(v) => customForm.setValue('autoCreateInvoice', v)}
                disabled={isPending}
              />

            </form>
          )}
        </div>

        {/* Sticky footer — targets whichever form is active */}
        <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-3">
          <Button
            type="button" variant="outline" className="flex-1"
            onClick={() => onOpenChange(false)} disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={mode === 'plan' ? 'sub-plan-form' : 'sub-custom-form'}
            className="flex-1"
            disabled={isPending || (mode === 'plan' && !selectedPlan)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Assigning…' : 'Assign & Invoice'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

// Branch field is completely removed — passed silently via defaultBranchId prop
function CommonFields({
  register,
  isPending,
  startDateValue,
  onStartDateChange,
}: {
  register:           ReturnType<typeof useForm>['register'];
  isPending:          boolean;
  startDateValue:     string;
  onStartDateChange:  (v: string | undefined) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Start Date</Label>
        <DatePicker
          id="startDate"
          value={startDateValue}
          onChange={onStartDateChange}
        />
        <p className="text-xs text-muted-foreground">Defaults to today. Change if the membership starts on a different date.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Optional internal notes…"
          disabled={isPending}
          {...(register as (name: string) => object)('notes')}
        />
      </div>
    </>
  );
}

function AutoInvoiceToggle({
  checked,
  onChange,
  disabled,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Auto-create Invoice</p>
        <p className="text-xs text-muted-foreground">
          Automatically issue an invoice when assigning this membership.
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function FormFooter({
  onCancel,
  isPending,
  disabled = false,
}: {
  onCancel:  () => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2 pb-4">
      <Button
        type="button" variant="outline" className="flex-1"
        onClick={onCancel} disabled={isPending}
      >
        Cancel
      </Button>
      <Button type="submit" className="flex-1" disabled={isPending || disabled}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? 'Assigning…' : 'Assign & Invoice'}
      </Button>
    </div>
  );
}