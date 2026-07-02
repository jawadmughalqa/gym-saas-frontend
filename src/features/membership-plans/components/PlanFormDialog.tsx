import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Info } from 'lucide-react';

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
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type {
  MembershipPlan,
  CreateMembershipPlanRequest,
} from '@/api/generated/schemas';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

// ─── Zod schema (mirrors backend CreateMembershipPlanSchema) ──────────────────

const BILLING_FREQUENCIES = [
  'daily', 'weekly', 'monthly', 'quarterly',
  'semi_annual', 'annual', 'one_time',
] as const;

const planFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Plan name must be at least 2 characters')
    .max(100, 'Plan name must be at most 100 characters')
    .trim(),
  description: z.string().max(500).optional(),
  billingFrequency: z.enum(BILLING_FREQUENCIES, {
    required_error: 'Billing frequency is required',
  }),
  durationDays: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .or(z.literal('')),
  basePrice: z.coerce
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  currency: z.string().length(3),
  features: z
    .array(z.object({ value: z.string().max(100) }))
    .max(20)
    .optional(),
  maxFreezes: z.coerce.number().int().min(0).default(2),
  freezeDurationDays: z.coerce.number().int().min(1).default(30),
  branchPricingOverrides: z
    .array(
      z.object({
        branchId: z.string().min(1, 'Branch ID is required'),
        price:    z.coerce.number().min(0, 'Price cannot be negative'),
      }),
    )
    .optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

// ─── Pakistan-region gym preset features ──────────────────────────────────────

const PRESET_FEATURES = [
  'Locker',
  'Changing Room',
  'Treadmill',
  'Free Weights',
  'Cardio Machines',
  'Swimming Pool',
  'Steam Room',
  'Sauna',
  'Yoga Classes',
  'Boxing / Martial Arts',
  'Group Classes',
  'Personal Trainer',
  'Air Conditioning',
  'WiFi',
  'Parking',
  'Water Dispenser',
  'Towel Service',
  'Juice Bar',
] as const;

// ─── Frequency display labels ─────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<string, string> = {
  daily:       'Daily',
  weekly:      'Weekly',
  monthly:     'Monthly',
  quarterly:   'Quarterly',
  semi_annual: 'Semi-Annual',
  annual:      'Annual',
  one_time:    'One-Time',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: MembershipPlan;
  onSubmit: (data: CreateMembershipPlanRequest) => void;
  isSubmitting: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isSubmitting,
}: PlanFormDialogProps) {
  const isEdit = !!defaultValues;
  const { currency: tenantCurrency } = useTenantCurrency();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name:               '',
      description:        '',
      billingFrequency:   'monthly',
      durationDays:       '',
      basePrice:          0,
      currency:           tenantCurrency,
      maxFreezes:         2,
      freezeDurationDays: 30,
      features:           [],
      branchPricingOverrides: [],
    },
  });

  // ── Features field array ───────────────────────────────────────────────────
  const {
    fields:  featureFields,
    append:  appendFeature,
    remove:  removeFeature,
  } = useFieldArray({ control: form.control, name: 'features' });

  // ── Branch overrides field array ───────────────────────────────────────────
  const {
    fields:  overrideFields,
    append:  appendOverride,
    remove:  removeOverride,
  } = useFieldArray({ control: form.control, name: 'branchPricingOverrides' });

  // ── Reset form when defaultValues change ───────────────────────────────────
  useEffect(() => {
    if (open) {
      if (defaultValues) {
        form.reset({
          name:               defaultValues.name ?? '',
          description:        defaultValues.description ?? '',
          billingFrequency:   (defaultValues.billingFrequency as typeof BILLING_FREQUENCIES[number]) ?? 'monthly',
          durationDays:       defaultValues.durationDays ?? '',
          basePrice:          defaultValues.basePrice ?? 0,
          currency:           tenantCurrency,
          maxFreezes:         defaultValues.maxFreezes ?? 2,
          freezeDurationDays: defaultValues.freezeDurationDays ?? 30,
          features:           (defaultValues.features ?? []).map((v) => ({ value: v })),
          branchPricingOverrides: (defaultValues.branchPricingOverrides ?? []).map((o) => ({
            branchId: o.branchId ?? '',
            price:    o.price    ?? 0,
          })),
        });
      } else {
        form.reset({
          name:               '',
          description:        '',
          billingFrequency:   'monthly',
          durationDays:       '',
          basePrice:          0,
          currency:           tenantCurrency,
          maxFreezes:         2,
          freezeDurationDays: 30,
          features:           [],
          branchPricingOverrides: [],
        });
      }
    }
  }, [open, defaultValues, form, tenantCurrency]);

  // ── Keep currency synced with tenant setting ───────────────────────────────
  useEffect(() => {
    if (tenantCurrency) {
      form.setValue('currency', tenantCurrency);
    }
  }, [tenantCurrency, form]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (values: PlanFormValues) => {
    const payload: CreateMembershipPlanRequest = {
      name:               values.name,
      billingFrequency:   values.billingFrequency as CreateMembershipPlanRequest['billingFrequency'],
      basePrice:          values.basePrice,
      currency:           values.currency,
      maxFreezes:         values.maxFreezes,
      freezeDurationDays: values.freezeDurationDays,
    };

    if (values.description)  payload.description  = values.description;
    if (values.durationDays && values.durationDays !== '')
      payload.durationDays = Number(values.durationDays);

    if (values.features && values.features.length > 0)
      payload.features = values.features.map((f) => f.value).filter(Boolean);

    if (values.branchPricingOverrides && values.branchPricingOverrides.length > 0)
      payload.branchPricingOverrides = values.branchPricingOverrides;

    onSubmit(payload);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Membership Plan' : 'Create Membership Plan'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

            {/* ── Basic Info ──────────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Monthly Standard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description for this plan..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Pricing ─────────────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pricing
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Base Price */}
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={0.01} placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency — read-only, derived from gym owner's country setting */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium select-none cursor-default">
                          <span>{field.value || tenantCurrency || '—'}</span>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Determined by your gym's country configuration
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Billing Frequency */}
                <FormField
                  control={form.control}
                  name="billingFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Frequency <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BILLING_FREQUENCIES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {FREQUENCY_LABELS[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Duration Days */}
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Duration (days)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-center">
                              How many days this membership stays active after purchase.
                              Leave empty for open-ended plans (e.g. monthly billing with no fixed expiry).
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Leave empty for open-ended"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ── Freeze Settings ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Freeze Policy
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxFreezes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Max Freezes per Cycle
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-center">
                              How many times a member can freeze their membership per billing cycle. Set to 0 to disable freezing.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="freezeDurationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Max Freeze Duration (days)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-center">
                              Maximum number of days a single freeze can last.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ── Features ────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Features
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFeature({ value: '' })}
                  disabled={featureFields.length >= 20}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Feature
                </Button>
              </div>

              {/* Preset quick-select chips */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Quick add common amenities:</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_FEATURES.map((preset) => {
                    const isActive = featureFields.some((f) => f.value === preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={featureFields.length >= 20 && !isActive}
                        onClick={() => {
                          if (isActive) {
                            const idx = featureFields.findIndex((f) => f.value === preset);
                            if (idx !== -1) removeFeature(idx);
                          } else {
                            appendFeature({ value: preset });
                          }
                        }}
                        className={`
                          inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          border transition-colors cursor-pointer select-none
                          ${isActive
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                          }
                          disabled:opacity-40 disabled:cursor-not-allowed
                        `}
                      >
                        {isActive && <span className="mr-1">✓</span>}
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {featureFields.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No features added yet. Features are shown on the plan card.
                </p>
              )}

              {featureFields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`features.${index}.value`}
                  render={({ field: f }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="e.g. Pool access" {...f} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(index)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* <Separator /> */}

            {/* ── Branch Price Overrides ───────────────────────────────────── */}
            {/* <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Branch Price Overrides
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optional — override the base price for specific branches.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendOverride({ branchId: '', price: 0 })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Override
                </Button>
              </div>

              {overrideFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name={`branchPricingOverrides.${index}.branchId`}
                    render={({ field: f }) => (
                      <FormItem className="flex-1">
                        {index === 0 && <FormLabel>Branch ID</FormLabel>}
                        <FormControl>
                          <Input placeholder="Branch ObjectId" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`branchPricingOverrides.${index}.price`}
                    render={({ field: f }) => (
                      <FormItem className="w-32">
                        {index === 0 && <FormLabel>Price</FormLabel>}
                        <FormControl>
                          <Input type="number" min={0} step={0.01} placeholder="0.00" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOverride(index)}
                    className={`shrink-0 text-muted-foreground hover:text-destructive ${index === 0 ? 'mt-8' : 'mt-0'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div> */}

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEdit ? 'Saving...' : 'Creating...'
                  : isEdit ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}