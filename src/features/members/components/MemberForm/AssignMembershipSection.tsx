/**
 * AssignMembershipSection
 *
 * Collapsible section shown during member CREATION only.
 * Two paths:
 *   - plan:   pick an existing plan + optional discount
 *   - custom: label + amount + frequency (for friends / special rates)
 *
 * Keeps fields minimal — advanced options (duration, add-ons, notes,
 * auto-invoice toggle) live in the full SubscriptionForm on the detail page.
 *
 * autoCreateInvoice is always true here and not shown to the user.
 */

import { useState } from 'react';
import { useController, type Control, type FieldErrors } from 'react-hook-form';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button }    from '@/components/ui/button';
import { Input }     from '@/components/ui/input';
import { Label }     from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetMembershipPlans } from '@/api/generated/membership-plans/membership-plans';
import type { MembershipPlan }   from '@/api/generated/schemas';
import type { MemberFormValues } from './types';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  control:    Control<MemberFormValues>;
  errors:     FieldErrors<MemberFormValues>;
  isPending:  boolean;
  /** Populated once the member is saved — used to display currency symbol. */
  currency?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignMembershipSection({ control, errors, isPending, currency: currencyProp }: Props) {
  const { currency: tenantCurrency } = useTenantCurrency();
  const currency = currencyProp ?? tenantCurrency;
  const [expanded,      setExpanded]      = useState(false);
  const [pricingMode,   setPricingMode]   = useState<'plan' | 'custom'>('plan');
  const [selectedPlan,  setSelectedPlan]  = useState<MembershipPlan | null>(null);

  // ── Fetch plans only when section is opened ───────────────────────────────
  const { data: plansResponse, isLoading: loadingPlans } = useGetMembershipPlans(
    { includeArchived: false },
    { query: { enabled: expanded } },
  );
  const plans: MembershipPlan[] = plansResponse?.data ?? [];

  // ── Controlled fields via react-hook-form Controller ─────────────────────
  const { field: planIdField }    = useController({ control, name: 'membership.planId' });
  const { field: discountField }  = useController({ control, name: 'membership.discountAmount' });
  const { field: labelField }     = useController({ control, name: 'membership.customLabel' });
  const { field: priceField }     = useController({ control, name: 'membership.customPrice' });
  const { field: freqField }      = useController({ control, name: 'membership.customBillingFrequency' });
  const { field: startDateField } = useController({ control, name: 'membership.startDate' });
  const { field: enabledField }   = useController({ control, name: 'membership.enabled' });

  // ── Price preview ─────────────────────────────────────────────────────────
  const discount      = Number(discountField.value)  || 0;
  const customPrice   = Number(priceField.value)     || 0;
  const planBasePrice = selectedPlan?.basePrice      ?? 0;

  const finalPrice = pricingMode === 'plan'
    ? Math.max(0, planBasePrice - discount)
    : Math.max(0, customPrice   - discount);

  const displayCurrency = pricingMode === 'plan'
    ? (selectedPlan?.currency ?? currency)
    : currency;

  // ── Toggle expand / collapse ──────────────────────────────────────────────
  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Mark enabled/disabled so the parent knows whether to submit membership
    enabledField.onChange(next);
    if (next) {
      // Pre-fill start date with today when section opens (if not already set)
      if (!startDateField.value) {
        startDateField.onChange(new Date().toISOString().slice(0, 10));
      }
    } else {
      // Clear all fields when collapsed so parent doesn't submit stale data
      planIdField.onChange('');
      discountField.onChange(0);
      labelField.onChange('');
      priceField.onChange(0);
      freqField.onChange('monthly');
      startDateField.onChange('');
      setSelectedPlan(null);
    }
  }

  // ── Mode switch ───────────────────────────────────────────────────────────
  function handleModeSwitch(mode: 'plan' | 'custom') {
    setPricingMode(mode);
    // Reset plan/custom fields when switching modes — keep startDate intact
    planIdField.onChange('');
    discountField.onChange(0);
    labelField.onChange('');
    priceField.onChange(0);
    freqField.onChange('monthly');
    setSelectedPlan(null);
  }

  return (
    <section className="space-y-3">
      {/* ── Toggle button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
          expanded
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          {!expanded && <Plus className="h-4 w-4" />}
          <div>
            <p className="text-sm font-medium">
              {expanded ? 'Assign Membership' : 'Assign Membership (optional)'}
            </p>
            {!expanded && (
              <p className="text-xs opacity-70">
                Assign a plan or custom rate during registration
              </p>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp   className="h-4 w-4 shrink-0" />
          : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {/* ── Expanded content ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="rounded-lg border p-4 space-y-4">

          {/* Mode picker */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeSwitch('plan')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                pricingMode === 'plan'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">Membership Plan</p>
              <p className="text-xs mt-0.5 opacity-70">Select an existing plan</p>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('custom')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                pricingMode === 'custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">Custom Rate</p>
              <p className="text-xs mt-0.5 opacity-70">Friends / special pricing</p>
            </button>
          </div>

          <Separator />

          {/* ── Plan path ────────────────────────────────────────────────── */}
          {pricingMode === 'plan' && (
            <div className="space-y-3">
              {/* Plan selector */}
              <div className="space-y-1.5">
                <Label>
                  Plan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={planIdField.value as string}
                  onValueChange={(v) => {
                    planIdField.onChange(v);
                    const found = plans.find((p) => p._id === v) ?? null;
                    setSelectedPlan(found);
                    discountField.onChange(0);
                  }}
                  disabled={isPending || loadingPlans}
                >
                  <SelectTrigger
                    className={
                      errors.membership?.planId ? 'border-destructive' : ''
                    }
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
                {errors.membership?.planId && (
                  <p className="text-xs text-destructive">
                    {errors.membership.planId.message}
                  </p>
                )}
              </div>

              {/* Discount — shown only after plan selected */}
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
                    step={1}
                    placeholder="0"
                    disabled={isPending}
                    value={discountField.value as number}
                    onChange={(e) => discountField.onChange(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Custom path ──────────────────────────────────────────────── */}
          {pricingMode === 'custom' && (
            <div className="space-y-3">
              {/* Label */}
              <div className="space-y-1.5">
                <Label htmlFor="customLabel">
                  Arrangement Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customLabel"
                  placeholder="e.g. Friend Rate, Staff Deal"
                  disabled={isPending}
                  className={errors.membership?.customLabel ? 'border-destructive' : ''}
                  value={labelField.value as string}
                  onChange={(e) => labelField.onChange(e.target.value)}
                />
                {errors.membership?.customLabel && (
                  <p className="text-xs text-destructive">
                    {errors.membership.customLabel.message}
                  </p>
                )}
              </div>

              {/* Amount + Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customPrice">
                    Amount ({currency}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customPrice"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    disabled={isPending}
                    className={errors.membership?.customPrice ? 'border-destructive' : ''}
                    value={priceField.value as number}
                    onChange={(e) => priceField.onChange(Number(e.target.value))}
                  />
                  {errors.membership?.customPrice && (
                    <p className="text-xs text-destructive">
                      {errors.membership.customPrice.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Select
                    value={(freqField.value as string) || 'monthly'}
                    onValueChange={(v) => freqField.onChange(v)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Monthly" />
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
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label htmlFor="custom-discount">Discount ({currency})</Label>
                <Input
                  id="custom-discount"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  disabled={isPending}
                  value={discountField.value as number}
                  onChange={(e) => discountField.onChange(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* ── Shared: start date (always shown when expanded) ──────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="membershipStartDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="membershipStartDate"
              value={(startDateField.value as string) ?? ''}
              onChange={(v) => startDateField.onChange(v ?? '')}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to today. Change if the membership starts on a different date.
            </p>
          </div>

          {/* ── Final price preview — shown once plan/price is selected ──── */}
          {(selectedPlan || (pricingMode === 'custom' && Number(priceField.value) > 0)) && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">Final Amount</span>
              <span className="text-lg font-bold text-primary">
                {displayCurrency} {finalPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}