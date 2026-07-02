import { format } from 'date-fns';
import {
  Users, DollarSign, TrendingUp, AlertCircle, UserCheck, Star,
  ClipboardList, Snowflake, AlertTriangle, CalendarClock, CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/shared/StatCard';
import { formatCurrencyCompact } from '@/utils/format';
import { useGetReportsDashboard } from '@/api/generated/reports/reports';
import { GrowthBadge, SectionTitle } from './ReportsShared';

export default function DashboardTab({ branchId }: { branchId?: string }) {
  const { data, isLoading } = useGetReportsDashboard(branchId ? { branchId } : undefined, {
    query: { staleTime: 60_000 },
  });
  const d = data?.data as Record<string, any> | undefined;

  const members       = d?.members       ?? {};
  const revenue       = d?.revenue       ?? {};
  const subscriptions = d?.subscriptions ?? {};
  const alerts        = d?.alerts        ?? {};
  const trainers      = d?.trainers      ?? {};

  const totalAlerts =
    (alerts.overdueInvoices          ?? 0) +
    (alerts.openWorkOrders           ?? 0) +
    (alerts.failedPaymentsThisMonth  ?? 0) +
    (alerts.equipmentUnderMaintenance ?? 0);

  return (
    <div className="space-y-8">

      {/* ── Members ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Members</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {isLoading ? (
            <>
              <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
              <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard title="Total Members"        value={String(members.total ?? 0)}         icon={Users} />
              <StatCard title="Active"               value={String(members.active ?? 0)}        icon={UserCheck}     iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatCard title="Frozen"               value={String(members.frozen ?? 0)}        icon={Snowflake}     iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <StatCard title="Suspended"            value={String(members.suspended ?? 0)}     icon={AlertTriangle} iconClassName="bg-orange-500/10 text-orange-600 dark:text-orange-400" />
              <StatCard title="New This Month"       value={String(members.newThisMonth ?? 0)}  icon={TrendingUp}    iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
              <StatCard title="Active Subscriptions" value={String(subscriptions.active ?? 0)} icon={ClipboardList} iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
            </>
          )}
        </div>
        {!isLoading && members.growthVsLastMonthPct !== undefined && (
          <div className="mt-2 pl-1">
            <GrowthBadge pct={members.growthVsLastMonthPct} />
          </div>
        )}
      </section>

      {/* ── Revenue ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Revenue</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <StatCardSkeleton /><StatCardSkeleton />
              <StatCardSkeleton /><StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard title="Today's Revenue" value={formatCurrencyCompact(revenue.today     ?? 0)} icon={DollarSign} iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatCard title="This Week"        value={formatCurrencyCompact(revenue.thisWeek  ?? 0)} icon={DollarSign} iconClassName="bg-green-500/10 text-green-600 dark:text-green-400" />
              <StatCard title="This Month"       value={formatCurrencyCompact(revenue.thisMonth ?? 0)} icon={DollarSign} iconClassName="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
              <StatCard title="Last Month"       value={formatCurrencyCompact(revenue.lastMonth ?? 0)} icon={DollarSign} />
            </>
          )}
        </div>
        {!isLoading && revenue.growthVsLastMonthPct !== undefined && (
          <div className="mt-2 pl-1">
            <GrowthBadge pct={revenue.growthVsLastMonthPct} />
          </div>
        )}
      </section>

      {/* ── Subscriptions & Trainers ─────────────────────────────────────── */}
      <section>
        <SectionTitle>Subscriptions &amp; Staff</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <StatCardSkeleton /><StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Expiring in 30 Days"
                value={String(subscriptions.expiringSoon ?? 0)}
                icon={CalendarClock}
                iconClassName={(subscriptions.expiringSoon ?? 0) > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : undefined}
              />
              <StatCard
                title="Active Trainers"
                value={String(trainers.active ?? 0)}
                icon={Star}
                iconClassName="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Alerts &amp; Operations
          </h3>
          {!isLoading && totalAlerts > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {totalAlerts}
            </Badge>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <StatCardSkeleton /><StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Overdue Invoices"
                value={String(alerts.overdueInvoices ?? 0)}
                icon={AlertCircle}
                iconClassName={(alerts.overdueInvoices ?? 0) > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' : undefined}
              />
              <StatCard
                title="Outstanding Invoices"
                value={String(alerts.outstandingInvoices ?? 0)}
                icon={CreditCard}
                iconClassName={(alerts.outstandingInvoices ?? 0) > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : undefined}
              />
            </>
          )}
        </div>
      </section>

      {/* Timestamp */}
      {d?.generatedAt && (
        <p className="text-right text-xs text-muted-foreground">
          Updated: {format(new Date(d.generatedAt as string), 'MMM dd, yyyy h:mm a')}
        </p>
      )}
    </div>
  );
}
