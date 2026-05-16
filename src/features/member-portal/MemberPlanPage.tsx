import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useMySubscriptions } from './hooks/useMemberPortal';
import { formatDate, formatCurrency } from '@/utils/format';
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

// ─── Subscription card ────────────────────────────────────────────────────────

function SubscriptionCard({ sub, isActive }: { sub: Subscription; isActive: boolean }) {
  const planName = sub.planSnapshot?.name ?? sub.customLabel ?? 'Custom Plan';
  const billingFreq =
    sub.planSnapshot?.billingFrequency ?? sub.customBillingFrequency ?? '—';
  const price = sub.finalPrice ?? sub.planSnapshot?.price ?? sub.customPrice ?? 0;

  return (
    <Card className={isActive ? 'border-2 border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{planName}</CardTitle>
          <Badge variant={statusVariant(sub.status)} className="shrink-0">
            {sub.status}
          </Badge>
        </div>
        {isActive && (
          <p className="text-xs text-primary font-medium">Current Active Plan</p>
        )}
      </CardHeader>
      <CardContent className="text-sm space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Start Date</span>
          <span className="text-foreground">{formatDate(sub.startDate)}</span>
        </div>
        {sub.endDate && (
          <div className="flex justify-between">
            <span>End Date</span>
            <span className="text-foreground">{formatDate(sub.endDate)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Billing</span>
          <span className="text-foreground capitalize">{billingFreq.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span>Price</span>
          <span className="text-foreground font-semibold">{formatCurrency(price)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberPlanPage() {
  const { data: subscriptions, isLoading } = useMySubscriptions();

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

  const subs = subscriptions ?? [];
  const active = subs.filter((s) => s.status === 'active');
  const historical = subs.filter((s) => s.status !== 'active');
  const ordered = [...active, ...historical];

  return (
    <PageShell>
      <PageHeader
        title="My Plan"
        subtitle="Your current and past membership subscriptions"
      />

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
