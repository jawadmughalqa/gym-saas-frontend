/**
 * ChangePlanDialog
 *
 * Lets the gym owner switch an active subscription to a different plan.
 * What happens on the backend:
 *   1. Current subscription is marked 'cancelled' (reason: plan_changed)
 *   2. A new active subscription is created for the selected plan
 *   3. A new invoice is auto-created (autoCreateInvoice: true by default)
 */

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button }    from '@/components/ui/button';
import { Input }     from '@/components/ui/input';
import { Label }     from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useGetMembershipPlans } from '@/api/generated/membership-plans/membership-plans';
import { usePostMembersMemberIdSubscriptionsSubscriptionIdChangePlan } from '@/api/generated/members/members';
import type { MembershipPlan } from '@/api/generated/schemas';
import { CURRENCY } from '@/config/tenant.config';
import { formatCurrency } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:            boolean;
  onOpenChange:    (open: boolean) => void;
  memberId:        string;
  subscriptionId:  string;
  currentPlanName: string;
  onSuccess:       () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChangePlanDialog({
  open, onOpenChange, memberId, subscriptionId, currentPlanName, onSuccess,
}: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [discount,       setDiscount]       = useState<string>('0');

  // ── Fetch active plans ─────────────────────────────────────────────────────
  const { data: plansResp, isLoading: loadingPlans } = useGetMembershipPlans(
    { includeArchived: false },
    { query: { enabled: open } },
  );
  const plans: MembershipPlan[] = plansResp?.data ?? [];

  const selectedPlan = plans.find((p) => p._id === selectedPlanId) ?? null;
  const basePrice    = selectedPlan?.basePrice ?? 0;
  const discountNum  = Math.max(0, Number(discount) || 0);
  const finalPrice   = Math.max(0, basePrice - discountNum);
  const currency     = selectedPlan?.currency ?? CURRENCY;

  // ── Mutation ───────────────────────────────────────────────────────────────
  const changeMutation = usePostMembersMemberIdSubscriptionsSubscriptionIdChangePlan({
    mutation: {
      onSuccess: () => {
        toast({
          title: 'Plan changed',
          description: `Switched to ${selectedPlan?.name ?? 'new plan'}. An invoice has been created.`,
        });
        handleClose(false);
        onSuccess();
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to change plan',
          description: err?.response?.data?.message ?? 'Something went wrong.',
        });
      },
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function handleClose(open: boolean) {
    if (!open) {
      setSelectedPlanId('');
      setDiscount('0');
    }
    onOpenChange(open);
  }

  function handleConfirm() {
    if (!selectedPlanId) return;
    changeMutation.mutate({
      memberId,
      subscriptionId,
      data: {
        newPlanId:          selectedPlanId,
        discountAmount:     discountNum,
        autoCreateInvoice:  true,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Membership Plan</DialogTitle>
          <DialogDescription>
            Current plan: <strong>{currentPlanName}</strong>. The current subscription
            will be cancelled immediately and a new one created. A new invoice will be
            generated for the first cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* New plan selector */}
          <div className="space-y-1.5">
            <Label>New Plan <span className="text-destructive">*</span></Label>
            <Select
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
              disabled={changeMutation.isPending || loadingPlans}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingPlans ? 'Loading plans…' : 'Select a plan'}
                />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan._id} value={plan._id ?? ''}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{plan.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {plan.currency} {plan.basePrice?.toFixed(0)} / {plan.billingFrequency}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount — only shown after plan selected */}
          {selectedPlan && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="changePlanDiscount">
                  Discount ({currency})
                </Label>
                <Input
                  id="changePlanDiscount"
                  type="number"
                  min={0}
                  max={basePrice}
                  step={1}
                  placeholder="0"
                  disabled={changeMutation.isPending}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              {/* Price preview */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedPlan.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedPlan.billingFrequency} · invoice auto-created
                  </p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(finalPrice, currency)}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={changeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || changeMutation.isPending}
          >
            {changeMutation.isPending ? 'Changing…' : 'Change Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
