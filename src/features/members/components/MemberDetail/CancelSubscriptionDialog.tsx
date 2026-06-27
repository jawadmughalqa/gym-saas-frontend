/**
 * CancelSubscriptionDialog
 *
 * Enterprise-grade subscription cancellation with three modes:
 *
 *  1. end_of_period       — Access continues until nextRenewalDate; no refund.
 *                           Billing worker cancels the subscription when renewal fires.
 *  2. immediate_prorated  — Cancel now; unused days credited to the member's wallet.
 *  3. immediate_no_refund — Cancel now; no wallet credit.
 *
 * A live proration preview (days used / remaining, refund amount) is computed
 * entirely on the client so the user sees the numbers before confirming.
 */

import { useState, useMemo } from 'react';
import { CalendarX2, AlertTriangle, Wallet, Ban, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast }    from '@/hooks/use-toast';
import { usePostMembersMemberIdSubscriptionsSubscriptionIdCancel } from '@/api/generated/members/members';
import { CURRENCY } from '@/config/tenant.config';
import { formatCurrency } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type CancelMode = 'end_of_period' | 'immediate_prorated' | 'immediate_no_refund';

// Minimal subscription shape needed for proration preview
interface SubscriptionLike {
  finalPrice?: number;
  startDate?: string;
  nextRenewalDate?: string | null;
  lastInvoiceGeneratedAt?: string | null;
  planSnapshot?: { name?: string };
  customLabel?: string;
}

interface Props {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  memberId:       string;
  subscriptionId: string;
  planName:       string;
  subscription:   SubscriptionLike;
  onSuccess:      () => void;
}

// ─── Proration helpers ────────────────────────────────────────────────────────

interface ProrationInfo {
  periodStart:   Date;
  periodEnd:     Date;
  totalDays:     number;
  usedDays:      number;
  remainingDays: number;
  refundAmount:  number;
  ratio:         number;   // 0-1
}

function computeProration(sub: SubscriptionLike): ProrationInfo | null {
  const periodStart = sub.lastInvoiceGeneratedAt
    ? new Date(sub.lastInvoiceGeneratedAt)
    : sub.startDate
      ? new Date(sub.startDate)
      : null;

  const periodEnd = sub.nextRenewalDate ? new Date(sub.nextRenewalDate) : null;
  if (!periodStart || !periodEnd) return null;

  const now      = new Date();
  const totalMs  = periodEnd.getTime() - periodStart.getTime();
  const usedMs   = now.getTime()       - periodStart.getTime();
  const remainMs = totalMs - usedMs;

  if (totalMs <= 0) return null;

  const msPerDay     = 1000 * 60 * 60 * 24;
  const totalDays    = Math.round(totalMs  / msPerDay);
  const usedDays     = Math.max(0, Math.round(usedMs   / msPerDay));
  const remainDays   = Math.max(0, Math.round(remainMs / msPerDay));
  const ratio        = Math.max(0, Math.min(1, remainMs / totalMs));
  const refundAmount = Math.round(ratio * (sub.finalPrice ?? 0));

  return {
    periodStart,
    periodEnd,
    totalDays,
    usedDays,
    remainingDays: remainDays,
    refundAmount,
    ratio,
  };
}

// ─── Mode option card ─────────────────────────────────────────────────────────

interface ModeCardProps {
  selected:    boolean;
  onSelect:    () => void;
  title:       string;
  description: string;
  badge?:      React.ReactNode;
  icon:        React.ReactNode;
  accent?:     'default' | 'warning' | 'destructive';
}

function ModeCard({
  selected, onSelect, title, description, badge, icon, accent = 'default',
}: ModeCardProps) {
  const borderClass = selected
    ? accent === 'destructive'
      ? 'border-destructive bg-destructive/5'
      : accent === 'warning'
        ? 'border-amber-500 bg-amber-500/10'
        : 'border-primary bg-primary/5'
    : 'border-border hover:border-muted-foreground/40';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border-2 p-3.5 transition-all ${borderClass}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{title}</span>
            {badge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center
          ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-card" />}
        </div>
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelSubscriptionDialog({
  open, onOpenChange, memberId, subscriptionId, planName, subscription, onSuccess,
}: Props) {
  const [mode,   setMode]   = useState<CancelMode>('end_of_period');
  const [reason, setReason] = useState('');

  const proration = useMemo(() => computeProration(subscription), [subscription]);

  const cancelMutation = usePostMembersMemberIdSubscriptionsSubscriptionIdCancel({
    mutation: {
      onSuccess: (_, variables) => {
        const m = (variables.data as { cancelMode?: CancelMode }).cancelMode ?? 'end_of_period';
        const refundAmt = proration?.refundAmount ?? 0;

        const desc =
          m === 'end_of_period'
            ? `${planName} will be cancelled at the end of the current billing period.`
            : m === 'immediate_prorated' && refundAmt > 0
              ? `${planName} has been cancelled. ${formatCurrency(refundAmt, CURRENCY)} credited to wallet.`
              : `${planName} has been cancelled immediately.`;

        toast({ title: 'Done', description: desc });
        onOpenChange(false);
        onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Something went wrong.';
        toast({ variant: 'destructive', title: 'Failed to cancel', description: msg });
      },
    },
  });

  function handleClose(v: boolean) {
    if (!v) {
      setReason('');
      setMode('end_of_period');
    }
    onOpenChange(v);
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    cancelMutation.mutate({
      memberId,
      subscriptionId,
      data: { reason: reason.trim(), cancelMode: mode },
    });
  }

  const renewalDate = subscription.nextRenewalDate
    ? new Date(subscription.nextRenewalDate).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX2 className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Choose how to cancel <strong>{planName}</strong> for this member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* ── Mode selector ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Cancellation Mode
            </Label>

            <div className="space-y-2">
              <ModeCard
                selected={mode === 'end_of_period'}
                onSelect={() => setMode('end_of_period')}
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="End of Period"
                accent="default"
                badge={
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Recommended
                  </span>
                }
                description={
                  renewalDate
                    ? `Member keeps access until ${renewalDate}. No refund is issued. Safe and non-disruptive.`
                    : 'Member keeps access until the current period ends. No refund is issued.'
                }
              />

              <ModeCard
                selected={mode === 'immediate_prorated'}
                onSelect={() => setMode('immediate_prorated')}
                icon={<Wallet className="h-4 w-4" />}
                title="Cancel Now — Prorated Refund"
                accent="warning"
                badge={
                  proration && proration.refundAmount > 0 ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                      +{formatCurrency(proration.refundAmount, CURRENCY)} wallet credit
                    </span>
                  ) : undefined
                }
                description="Cancel immediately. Unused days are calculated and credited to the member's wallet."
              />

              <ModeCard
                selected={mode === 'immediate_no_refund'}
                onSelect={() => setMode('immediate_no_refund')}
                icon={<Ban className="h-4 w-4" />}
                title="Cancel Now — No Refund"
                accent="destructive"
                description="Cancel immediately. No wallet credit or refund is issued."
              />
            </div>
          </div>

          {/* ── Proration preview ─────────────────────────────────────────── */}
          {mode === 'immediate_prorated' && proration && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3.5 space-y-3">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                Proration Breakdown
              </p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-card border border-amber-500/25 py-2 px-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Billing period</p>
                  <p className="text-sm font-bold">{proration.totalDays}d</p>
                </div>
                <div className="rounded-md bg-card border border-destructive/20 py-2 px-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Days used</p>
                  <p className="text-sm font-bold text-destructive">{proration.usedDays}d</p>
                </div>
                <div className="rounded-md bg-card border border-emerald-500/25 py-2 px-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Days remaining</p>
                  <p className="text-sm font-bold text-emerald-600">{proration.remainingDays}d</p>
                </div>
              </div>

              {/* Usage bar */}
              <div className="space-y-1">
                <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive/70 transition-all"
                    style={{
                      width: `${Math.min(100, (proration.usedDays / proration.totalDays) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span>{Math.round((proration.usedDays / proration.totalDays) * 100)}% used</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Calculation summary */}
              <div className="rounded-md bg-card border border-amber-500/25 px-3 py-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {proration.remainingDays}d / {proration.totalDays}d ×{' '}
                  amount paid
                </div>
                <div className="text-sm font-bold text-emerald-500">
                  ≈ {formatCurrency(proration.refundAmount, CURRENCY)} wallet credit
                </div>
              </div>

              {/* Unpaid invoice notice */}
              <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/25 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-500 leading-relaxed">
                  If the current invoice has <strong>not been paid</strong>, it will be
                  voided automatically (removed from Outstanding Fees) — no wallet credit in that case.
                  If it <strong>has been paid</strong>, the unused portion is credited to the wallet.
                </p>
              </div>
            </div>
          )}

          {mode === 'immediate_prorated' && !proration && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-500">
                Proration preview unavailable — subscription date information is missing.
                The server will still check the invoice status and handle it correctly.
              </p>
            </div>
          )}

          {/* ── Reason ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancelReason"
              placeholder="e.g. Member requested cancellation, relocated abroad, financial hardship…"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={cancelMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={cancelMutation.isPending}
          >
            Go Back
          </Button>
          <Button
            variant={mode === 'end_of_period' ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={!reason.trim() || cancelMutation.isPending}
          >
            {cancelMutation.isPending
              ? 'Cancelling…'
              : mode === 'end_of_period'
                ? 'Schedule Cancellation'
                : 'Cancel Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
