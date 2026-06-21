import { Wallet, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useMySubscriptions, useMyProfile } from './hooks/use-member-portal';
import { formatDate, formatCurrency } from '@/utils/format';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import type { Subscription } from '@/types/member.types';

// ─── Status badge helper ──────────────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':      return 'default';
    case 'frozen':      return 'secondary';
    case 'expired':
    case 'cancelled':   return 'destructive';
    default:            return 'outline';
  }
}

// ─── Wallet balance banner ────────────────────────────────────────────────────

function WalletBanner({ balance }: { balance: number }) {
  const { currency } = useTenantCurrency();
  if (balance <= 0) return null;
  return (
    <Card className="border-emerald-200 bg-emerald-50/60">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 shrink-0">
          <Wallet className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-emerald-700 font-medium">Wallet Credit</p>
          <p className="text-lg font-bold text-emerald-800 leading-tight">
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <p className="text-[11px] text-emerald-600 text-right max-w-[140px] leading-snug">
          Available to apply on your next invoice
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Subscription card ────────────────────────────────────────────────────────

function SubscriptionCard({ sub, isActive }: { sub: Subscription; isActive: boolean }) {
  const { currency } = useTenantCurrency();
  const planName    = sub.planSnapshot?.name ?? sub.customLabel ?? 'Custom Plan';
  const billingFreq = sub.planSnapshot?.billingFrequency ?? sub.customBillingFrequency ?? '—';
  const price       = sub.finalPrice ?? sub.planSnapshot?.price ?? sub.customPrice ?? 0;

  const isCancelledAtEnd =
    (sub as Subscription & { cancelAtPeriodEnd?: boolean }).cancelAtPeriodEnd === true &&
    sub.status === 'active';

  return (
    <Card className={isActive ? 'border-2 border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{planName}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusVariant(sub.status)} className="shrink-0">
              {sub.status}
            </Badge>
            {isCancelledAtEnd && (
              <span className="text-[10px] text-amber-600 font-medium">
                Cancels at period end
              </span>
            )}
          </div>
        </div>
        {isActive && !isCancelledAtEnd && (
          <p className="text-xs text-primary font-medium">Current Active Plan</p>
        )}
        {isCancelledAtEnd && (
          <p className="text-xs text-amber-600 font-medium">
            Active until {sub.nextRenewalDate ? formatDate(sub.nextRenewalDate) : 'end of period'}
          </p>
        )}
      </CardHeader>

      <CardContent className="text-sm space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Start Date</span>
          <span className="text-foreground">{formatDate(sub.startDate)}</span>
        </div>

        {sub.nextRenewalDate && sub.status === 'active' && (
          <div className="flex justify-between">
            <span>{isCancelledAtEnd ? 'Access until' : 'Next Renewal'}</span>
            <span className="text-foreground">{formatDate(sub.nextRenewalDate)}</span>
          </div>
        )}

        {sub.status === 'cancelled' && sub.cancelledAt && (
          <div className="flex justify-between">
            <span>Cancelled on</span>
            <span className="text-foreground">{formatDate(sub.cancelledAt)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Billing</span>
          <span className="text-foreground capitalize">{billingFreq.replace(/_/g, ' ')}</span>
        </div>

        <div className="flex justify-between">
          <span>Price</span>
          <span className="text-foreground font-semibold">{formatCurrency(price, currency)}</span>
        </div>

        {/* Proration refund detail — only shown on cancelled + refund > 0 */}
        {sub.status === 'cancelled' &&
          ((sub as Subscription & { prorationRefundAmount?: number }).prorationRefundAmount ?? 0) > 0 && (
          <div className="mt-2 pt-2 border-t border-border flex justify-between">
            <span className="text-emerald-600">Wallet credit issued</span>
            <span className="text-emerald-700 font-semibold">
              +{formatCurrency(
                (sub as Subscription & { prorationRefundAmount?: number }).prorationRefundAmount ?? 0,
                currency,
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberPlanPage() {
  const { data: profile,       isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useMyProfile();
  const { data: subscriptions, isLoading: subsLoading,   isError: subsError,    refetch: refetchSubs    } = useMySubscriptions();
  const isLoading = profileLoading || subsLoading;
  const isError   = profileError   || subsError;

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="My Plan" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="My Plan" />
        <Card className="border-destructive/30">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load plan information.</p>
            <Button variant="outline" size="sm" onClick={() => { refetchProfile(); refetchSubs(); }}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const subs      = subscriptions ?? [];
  const active    = subs.filter((s) => s.status === 'active');
  const historical = subs.filter((s) => s.status !== 'active');
  const ordered   = [...active, ...historical];
  const wallet    = profile?.walletBalance ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="My Plan"
        subtitle="Your current and past membership subscriptions"
      />

      {/* Wallet credit banner */}
      <WalletBanner balance={wallet} />

      {ordered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No subscriptions found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordered.map((sub) => (
            <SubscriptionCard
              key={sub._id}
              sub={sub}
              isActive={sub.status === 'active'}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
