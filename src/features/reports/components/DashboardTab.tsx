import { format } from 'date-fns';
import {
  Users, DollarSign, TrendingUp, AlertCircle, UserCheck, Star,
  ClipboardList, Snowflake, AlertTriangle, CalendarClock, CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
          <StatCard title="Total Members"        value={isLoading ? '—' : String(members.total ?? 0)}         icon={Users} />
          <StatCard title="Active"               value={isLoading ? '—' : String(members.active ?? 0)}        icon={UserCheck}     iconClassName="bg-emerald-500" />
          <StatCard title="Frozen"               value={isLoading ? '—' : String(members.frozen ?? 0)}        icon={Snowflake}     iconClassName="bg-blue-500" />
          <StatCard title="Suspended"            value={isLoading ? '—' : String(members.suspended ?? 0)}     icon={AlertTriangle} iconClassName="bg-orange-500" />
          <StatCard title="New This Month"       value={isLoading ? '—' : String(members.newThisMonth ?? 0)}  icon={TrendingUp}    iconClassName="bg-violet-500/10" />
          <StatCard title="Active Subscriptions" value={isLoading ? '—' : String(subscriptions.active ?? 0)} icon={ClipboardList} iconClassName="bg-indigo-500" />
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
          <StatCard title="Today's Revenue" value={isLoading ? '—' : formatCurrencyCompact(revenue.today     ?? 0)} icon={DollarSign} iconClassName="bg-emerald-500" />
          <StatCard title="This Week"        value={isLoading ? '—' : formatCurrencyCompact(revenue.thisWeek  ?? 0)} icon={DollarSign} iconClassName="bg-green-500" />
          <StatCard title="This Month"       value={isLoading ? '—' : formatCurrencyCompact(revenue.thisMonth ?? 0)} icon={DollarSign} iconClassName="bg-teal-500" />
          <StatCard title="Last Month"       value={isLoading ? '—' : formatCurrencyCompact(revenue.lastMonth ?? 0)} icon={DollarSign} iconClassName="bg-muted/600/10" />
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
          <StatCard
            title="Expiring in 30 Days"
            value={isLoading ? '—' : String(subscriptions.expiringSoon ?? 0)}
            icon={CalendarClock}
            iconClassName={(subscriptions.expiringSoon ?? 0) > 0 ? 'bg-amber-500' : undefined}
          />
          <StatCard
            title="Active Trainers"
            value={isLoading ? '—' : String(trainers.active ?? 0)}
            icon={Star}
            iconClassName="bg-yellow-500"
          />
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
          <StatCard
            title="Overdue Invoices"
            value={isLoading ? '—' : String(alerts.overdueInvoices ?? 0)}
            icon={AlertCircle}
            iconClassName={(alerts.overdueInvoices ?? 0) > 0 ? 'bg-red-500' : undefined}
          />
          <StatCard
            title="Outstanding Invoices"
            value={isLoading ? '—' : String(alerts.outstandingInvoices ?? 0)}
            icon={CreditCard}
            iconClassName={(alerts.outstandingInvoices ?? 0) > 0 ? 'bg-amber-500' : undefined}
          />
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
