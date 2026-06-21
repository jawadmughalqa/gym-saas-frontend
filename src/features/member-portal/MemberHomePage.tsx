import { differenceInDays, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useMyProfile, useMySubscriptions, useMyInvoices, useMyCheckIns } from './hooks/use-member-portal';
import { formatDate, formatCurrency } from '@/utils/format';

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

// ─── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="py-6 flex flex-col items-center gap-2 text-center">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load. <Button variant="link" size="sm" className="h-auto p-0" onClick={onRetry}>Retry</Button></p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberHomePage() {
  const { data: profile,       isLoading: loadingProfile,   isError: errorProfile,   refetch: refetchProfile   } = useMyProfile();
  const { data: subscriptions, isLoading: loadingSubs,      isError: errorSubs,      refetch: refetchSubs      } = useMySubscriptions();
  const { data: invoicesData,  isLoading: loadingInvoices,  isError: errorInvoices,  refetch: refetchInvoices  } = useMyInvoices();
  const { data: checkIns,      isLoading: loadingCheckIns,  isError: errorCheckIns,  refetch: refetchCheckIns  } = useMyCheckIns();

  const firstName = profile?.firstName ?? 'Member';

  // Active subscription
  const activeSub = subscriptions?.find((s) => s.status === 'active');

  // Days remaining
  let daysRemaining: number | null = null;
  if (activeSub?.endDate) {
    daysRemaining = differenceInDays(parseISO(activeSub.endDate), new Date());
  }

  // Outstanding invoices (issued + overdue + partially_paid)
  const unpaidInvoices = invoicesData?.invoices?.filter(
    (inv) => inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'partially_paid',
  ) ?? [];
  const totalDue = unpaidInvoices.reduce((sum, inv) => sum + (inv.amountDue ?? 0), 0);

  // Recent check-ins (last 5)
  const recentCheckIns = (checkIns?.checkIns ?? []).slice(0, 5);

  return (
    <PageShell>
      <PageHeader title={`Welcome back, ${loadingProfile ? '…' : firstName} 👋`} />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active plan card */}
        {loadingProfile || loadingSubs ? (
          <Skeleton className="h-36 rounded-xl" />
        ) : errorProfile || errorSubs ? (
          <ErrorCard onRetry={() => { refetchProfile(); refetchSubs(); }} />
        ) : (
          <Card className={activeSub ? 'border-2 border-primary/30' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {activeSub ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">
                      {activeSub.planSnapshot?.name ?? activeSub.customLabel ?? 'Custom Plan'}
                    </span>
                    <Badge variant={statusVariant(activeSub.status)}>
                      {activeSub.status}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <span>Started: {formatDate(activeSub.startDate)}</span>
                    {activeSub.endDate && (
                      <span>Expires: {formatDate(activeSub.endDate)}</span>
                    )}
                    {daysRemaining !== null && (
                      <span className={daysRemaining <= 7 ? 'text-destructive font-semibold' : 'text-foreground'}>
                        {daysRemaining > 0
                          ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
                          : 'Expired'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active plan</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Outstanding dues */}
        {loadingInvoices ? (
          <Skeleton className="h-36 rounded-xl" />
        ) : errorInvoices ? (
          <ErrorCard onRetry={refetchInvoices} />
        ) : (
          <Card className={unpaidInvoices.length > 0 ? 'border-destructive/40' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {unpaidInvoices.length > 0 ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                Outstanding Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length > 0 ? (
                <div className="space-y-1 text-sm">
                  <p className="text-destructive font-semibold text-base">
                    {formatCurrency(totalDue)}
                  </p>
                  <p className="text-muted-foreground">
                    {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All dues cleared. Great job!</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent check-ins */}
      {loadingCheckIns ? (
        <Skeleton className="h-40 w-full rounded-xl mt-4" />
      ) : errorCheckIns ? (
        <div className="mt-4"><ErrorCard onRetry={refetchCheckIns} /></div>
      ) : (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentCheckIns.map((ci) => (
                  <li key={ci._id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">
                      {formatDate(ci.checkedInAt)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {ci.method}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
