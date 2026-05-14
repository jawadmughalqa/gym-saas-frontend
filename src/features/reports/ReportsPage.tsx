import { useState, useMemo } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, DollarSign, TrendingUp, TrendingDown, Wrench, ClipboardList,
  UserCheck, Star, Activity, AlertCircle, UserX, Snowflake,
  CalendarClock, CreditCard, BarChart2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import { CURRENCY } from '@/config/tenant.config';
import {
  useGetReportsDashboard,
  useGetReportsRevenue,
  useGetReportsMembers,
  useGetReportsAttendance,
  useGetReportsTrainers,
} from '@/api/generated/reports/reports';
import type { GetReportsRevenueGranularity } from '@/api/generated/schemas/getReportsRevenueGranularity';
import type { GetReportsMembersGranularity } from '@/api/generated/schemas/getReportsMembersGranularity';
import type { GetReportsAttendanceGranularity } from '@/api/generated/schemas/getReportsAttendanceGranularity';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
const DAY_NAMES    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

/** Compact currency formatter for stat cards and chart axes */
const pkr = (value: number): string => {
  if (value >= 1_000_000) return `${CURRENCY} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${CURRENCY} ${(value / 1_000).toFixed(1)}K`;
  return `${CURRENCY} ${Math.round(value).toLocaleString()}`;
};

/** Full currency formatter for tooltips */
const pkrFull = (value: number): string =>
  `${CURRENCY} ${Math.round(value).toLocaleString()}`;

/** Growth badge: +12.5% or -3.0% or N/A */
function GrowthBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">vs last month: N/A</span>;
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{pct.toFixed(1)}% vs last month
    </span>
  );
}

// ─── Date range helpers ────────────────────────────────────────────────────────

type DatePreset = '7d' | '30d' | '90d' | '6m' | '12m' | 'this_month';

function getDateRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  switch (preset) {
    case '7d':         return { dateFrom: fmt(subDays(now, 7)),      dateTo: fmt(now) };
    case '30d':        return { dateFrom: fmt(subDays(now, 30)),     dateTo: fmt(now) };
    case '90d':        return { dateFrom: fmt(subDays(now, 90)),     dateTo: fmt(now) };
    case '6m':         return { dateFrom: fmt(subMonths(now, 6)),    dateTo: fmt(now) };
    case '12m':        return { dateFrom: fmt(subMonths(now, 12)),   dateTo: fmt(now) };
    case 'this_month': return { dateFrom: fmt(startOfMonth(now)),    dateTo: fmt(endOfMonth(now)) };
    default:           return { dateFrom: fmt(subDays(now, 30)),     dateTo: fmt(now) };
  }
}

function granularityForPreset(preset: DatePreset): 'day' | 'week' | 'month' {
  if (preset === '7d' || preset === '30d' || preset === 'this_month') return 'day';
  if (preset === '90d') return 'week';
  return 'month';
}

// ─── Shared small components ──────────────────────────────────────────────────

function DateRangeSelector({ value, onChange }: { value: DatePreset; onChange: (v: DatePreset) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DatePreset)}>
      <SelectTrigger className="w-36 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="this_month">This month</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
        <SelectItem value="6m">Last 6 months</SelectItem>
        <SelectItem value="12m">Last 12 months</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-5 space-y-4 ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <div className={`rounded-lg bg-muted animate-pulse`} style={{ height }} />;
}

function EmptyChart({ message = 'No data for this period.' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
      <BarChart2 className="h-4 w-4 mr-2 opacity-40" />
      {message}
    </div>
  );
}

// ─── DashboardTab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useGetReportsDashboard(undefined, {
    query: { staleTime: 60_000 },
  });
  const d = data?.data as Record<string, any> | undefined;

  const members      = d?.members       ?? {};
  const revenue      = d?.revenue       ?? {};
  const checkIns     = d?.checkIns      ?? {};
  const subscriptions = d?.subscriptions ?? {};
  const alerts       = d?.alerts        ?? {};
  const trainers     = d?.trainers      ?? {};

  const totalAlerts =
    (alerts.overdueInvoices   ?? 0) +
    (alerts.openWorkOrders    ?? 0) +
    (alerts.failedPaymentsThisMonth ?? 0) +
    (alerts.equipmentUnderMaintenance ?? 0);

  return (
    <div className="space-y-8">

      {/* ── Members ───────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Members</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total Members"
            value={isLoading ? '—' : String(members.total ?? 0)}
            icon={Users}
          />
          <StatCard
            title="Active"
            value={isLoading ? '—' : String(members.active ?? 0)}
            icon={UserCheck}
            iconClassName="bg-emerald-500/10"
          />
          <StatCard
            title="Inactive"
            value={isLoading ? '—' : String(members.inactive ?? 0)}
            icon={UserX}
            iconClassName="bg-slate-500/10"
          />
          <StatCard
            title="Frozen"
            value={isLoading ? '—' : String(members.frozen ?? 0)}
            icon={Snowflake}
            iconClassName="bg-blue-500/10"
          />
          <StatCard
            title="New This Month"
            value={isLoading ? '—' : String(members.newThisMonth ?? 0)}
            icon={TrendingUp}
            iconClassName="bg-violet-500/10"
          />
          <StatCard
            title="Active Subscriptions"
            value={isLoading ? '—' : String(subscriptions.active ?? 0)}
            icon={ClipboardList}
            iconClassName="bg-indigo-500/10"
          />
        </div>
        {!isLoading && members.growthVsLastMonthPct !== undefined && (
          <div className="mt-2 pl-1">
            <GrowthBadge pct={members.growthVsLastMonthPct} />
          </div>
        )}
      </section>

      {/* ── Revenue ───────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Revenue</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={isLoading ? '—' : pkr(revenue.today ?? 0)}
            icon={DollarSign}
            iconClassName="bg-emerald-500/10"
          />
          <StatCard
            title="This Week"
            value={isLoading ? '—' : pkr(revenue.thisWeek ?? 0)}
            icon={DollarSign}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="This Month"
            value={isLoading ? '—' : pkr(revenue.thisMonth ?? 0)}
            icon={DollarSign}
            iconClassName="bg-teal-500/10"
          />
          <StatCard
            title="Last Month"
            value={isLoading ? '—' : pkr(revenue.lastMonth ?? 0)}
            icon={DollarSign}
            iconClassName="bg-slate-500/10"
          />
        </div>
        {!isLoading && revenue.growthVsLastMonthPct !== undefined && (
          <div className="mt-2 pl-1">
            <GrowthBadge pct={revenue.growthVsLastMonthPct} />
          </div>
        )}
      </section>

      {/* ── Check-ins ─────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Check-Ins</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Today"
            value={isLoading ? '—' : String(checkIns.today ?? 0)}
            icon={Activity}
            iconClassName="bg-purple-500/10"
          />
          <StatCard
            title="This Week"
            value={isLoading ? '—' : String(checkIns.thisWeek ?? 0)}
            icon={Activity}
            iconClassName="bg-purple-500/10"
          />
          <StatCard
            title="This Month"
            value={isLoading ? '—' : String(checkIns.thisMonth ?? 0)}
            icon={Activity}
            iconClassName="bg-purple-500/10"
          />
        </div>
      </section>

      {/* ── Subscriptions & Trainers ──────────────────────────────────────── */}
      <section>
        <SectionTitle>Subscriptions &amp; Staff</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Expiring in 30 Days"
            value={isLoading ? '—' : String(subscriptions.expiringSoon ?? 0)}
            icon={CalendarClock}
            iconClassName={(subscriptions.expiringSoon ?? 0) > 0 ? 'bg-amber-500/10' : undefined}
          />
          <StatCard
            title="Active Trainers"
            value={isLoading ? '—' : String(trainers.active ?? 0)}
            icon={Star}
            iconClassName="bg-yellow-500/10"
          />
        </div>
      </section>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Overdue Invoices"
            value={isLoading ? '—' : String(alerts.overdueInvoices ?? 0)}
            icon={AlertCircle}
            iconClassName={(alerts.overdueInvoices ?? 0) > 0 ? 'bg-red-500/10' : undefined}
          />
          <StatCard
            title="Outstanding Invoices"
            value={isLoading ? '—' : String(alerts.outstandingInvoices ?? 0)}
            icon={CreditCard}
            iconClassName={(alerts.outstandingInvoices ?? 0) > 0 ? 'bg-amber-500/10' : undefined}
          />
          <StatCard
            title="Open Work Orders"
            value={isLoading ? '—' : String(alerts.openWorkOrders ?? 0)}
            icon={Wrench}
            iconClassName={(alerts.openWorkOrders ?? 0) > 0 ? 'bg-orange-500/10' : undefined}
          />
          <StatCard
            title="Failed Payments"
            value={isLoading ? '—' : String(alerts.failedPaymentsThisMonth ?? 0)}
            icon={AlertTriangle}
            iconClassName={(alerts.failedPaymentsThisMonth ?? 0) > 0 ? 'bg-red-500/10' : undefined}
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

// ─── RevenueTab ───────────────────────────────────────────────────────────────

function RevenueTab() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const { dateFrom, dateTo } = getDateRange(preset);
  const granularity = granularityForPreset(preset) as GetReportsRevenueGranularity;

  const { data, isLoading } = useGetReportsRevenue(
    { dateFrom, dateTo, granularity },
    { query: { staleTime: 300_000 } },
  );
  const d = data?.data as Record<string, any> | undefined;

  const totals    = d?.totals    as Record<string, number> | undefined;
  const timeSeries = (d?.timeSeries ?? []) as Record<string, any>[];
  const byMethod  = (d?.byMethod  ?? []) as Record<string, any>[];
  const outstanding = d?.outstanding as { count: number; totalAmount: number } | undefined;
  const overdue     = d?.overdue     as { count: number; totalAmount: number } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Revenue Analytics</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Gross Revenue"
          value={pkr(totals?.grossRevenue ?? 0)}
          icon={DollarSign}
          iconClassName="bg-emerald-500/10"
        />
        <StatCard
          title="Net Revenue"
          value={pkr(totals?.netRevenue ?? 0)}
          icon={DollarSign}
          iconClassName="bg-green-500/10"
        />
        <StatCard
          title="Total Refunded"
          value={pkr(totals?.totalRefunded ?? 0)}
          icon={TrendingDown}
          iconClassName="bg-amber-500/10"
        />
      </div>

      {/* Outstanding / Overdue */}
      {(outstanding || overdue) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {outstanding && outstanding.count > 0 && (
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-2xl font-bold tabular-nums">{pkr(outstanding.totalAmount)}</p>
              <p className="text-sm text-muted-foreground mt-1">{outstanding.count} invoices pending</p>
            </div>
          )}
          {overdue && overdue.count > 0 && (
            <div className="rounded-xl border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 p-5">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-1">Overdue</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{pkr(overdue.totalAmount)}</p>
              <p className="text-sm text-muted-foreground mt-1">{overdue.count} overdue invoices</p>
            </div>
          )}
        </div>
      )}

      {/* Revenue over time */}
      <ChartCard title="Revenue Over Time">
        {isLoading ? (
          <ChartSkeleton />
        ) : timeSeries.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => pkr(v)} width={80} />
              <Tooltip formatter={(v: number) => [pkrFull(v), 'Revenue']} />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                stroke={CHART_COLORS[0]}
                fill="url(#revGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* By payment method */}
      {byMethod.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ChartCard title="By Payment Method">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byMethod}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ method, percent }: { method: string; percent: number }) =>
                    `${method} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {byMethod.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => pkrFull(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Method Breakdown">
            <div className="space-y-3">
              {byMethod.map((item: any, i: number) => (
                <div key={item.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="capitalize">{(item.method as string)?.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold tabular-nums">{pkr(item.total ?? 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">({item.count} txns)</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

// ─── MembersTab ───────────────────────────────────────────────────────────────

function MembersTab() {
  const [preset, setPreset] = useState<DatePreset>('6m');
  const { dateFrom, dateTo } = getDateRange(preset);
  const granularity = granularityForPreset(preset) as GetReportsMembersGranularity;

  const { data, isLoading } = useGetReportsMembers(
    { dateFrom, dateTo, granularity, includeChurn: true },
    { query: { staleTime: 300_000 } },
  );
  const d = data?.data as Record<string, any> | undefined;

  const newMembersData = (d?.newMembersOverTime ?? []) as Record<string, any>[];
  const byStatus       = (d?.byStatus          ?? []) as Record<string, any>[];
  const byGender       = (d?.byGender          ?? []) as Record<string, any>[];
  const byPlan         = (d?.activeSubscriptionsByPlan ?? []) as Record<string, any>[];
  const churn          = d?.churn as { churned: number; churnRate: number } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Member Analytics</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* New members over time */}
      <ChartCard title="New Members Over Time">
        {isLoading ? (
          <ChartSkeleton />
        ) : newMembersData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={newMembersData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'New Members']} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Status + Gender breakdowns */}
      {(byStatus.length > 0 || byGender.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {byStatus.length > 0 && (
            <ChartCard title="By Status">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byStatus}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ key, percent }: { key: string; percent: number }) =>
                      `${key} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {byStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v: string) => <span className="capitalize text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {byGender.length > 0 && (
            <ChartCard title="By Gender">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byGender}
                    dataKey="count"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ key, percent }: { key: string; percent: number }) =>
                      `${key} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {byGender.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v: string) => <span className="capitalize text-xs">{v?.replace('_', ' ')}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {/* Active subscriptions by plan */}
      {byPlan.length > 0 && (
        <ChartCard title="Active Subscriptions by Plan">
          <div className="space-y-3">
            {byPlan.map((item: any) => {
              const pct = Math.min(100, ((item.count ?? 0) / (byPlan[0]?.count ?? 1)) * 100);
              return (
                <div key={item.planId} className="flex items-center gap-3">
                  <div className="flex-1 text-sm truncate font-medium">{item.planName ?? item.planId}</div>
                  <div className="w-36 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums">{item.count}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Churn */}
      {churn && (
        <div className="rounded-xl border bg-card p-5">
          <SectionTitle>Churn Analysis</SectionTitle>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-bold tabular-nums">{churn.churned ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">members churned in period</p>
            </div>
            <Badge
              variant={(churn.churnRate ?? 0) > 5 ? 'destructive' : 'secondary'}
              className="mb-1 text-sm px-3 py-1"
            >
              {(churn.churnRate ?? 0).toFixed(1)}% churn rate
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AttendanceTab ────────────────────────────────────────────────────────────

function AttendanceTab() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const { dateFrom, dateTo } = getDateRange(preset);
  const granularity = granularityForPreset(preset) as GetReportsAttendanceGranularity;

  const { data, isLoading } = useGetReportsAttendance(
    { dateFrom, dateTo, granularity },
    { query: { staleTime: 300_000 } },
  );
  const d = data?.data as Record<string, any> | undefined;

  const byPeriod = (d?.byPeriod ?? []) as Record<string, any>[];
  const byDayOfWeek = useMemo(
    () => ((d?.byDayOfWeek ?? []) as Record<string, any>[]).map((item) => ({
      ...item,
      name: DAY_NAMES[item.dayOfWeek as number ?? 0],
    })),
    [d],
  );
  const byHour   = (d?.byHourOfDay ?? []) as Record<string, any>[];
  const byMethod = (d?.byMethod    ?? []) as Record<string, any>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Attendance Analytics</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total Check-Ins"
          value={String(d?.totalCheckIns ?? 0)}
          icon={Activity}
          iconClassName="bg-purple-500/10"
        />
        <StatCard
          title="Unique Members"
          value={String(d?.uniqueMemberCount ?? 0)}
          icon={Users}
          iconClassName="bg-indigo-500/10"
        />
      </div>

      {/* Check-ins over time */}
      <ChartCard title="Check-Ins Over Time">
        {isLoading ? (
          <ChartSkeleton />
        ) : byPeriod.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={byPeriod} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'Check-Ins']} />
              <Area
                type="monotone"
                dataKey="checkIns"
                stroke={CHART_COLORS[2]}
                fill="url(#attendGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Day of week + Hour of day */}
      <div className="grid gap-4 sm:grid-cols-2">
        {byDayOfWeek.length > 0 && (
          <ChartCard title="By Day of Week">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDayOfWeek} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {byHour.length > 0 && (
          <ChartCard title="Peak Hours">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byHour} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="hourOfDay"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}:00`}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v: number) => `${v}:00–${v + 1}:00`} />
                <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* By check-in method */}
      {byMethod.length > 0 && (
        <ChartCard title="Check-In Method">
          <div className="flex flex-wrap gap-3">
            {byMethod.map((item: any, i: number) => (
              <div
                key={item.key}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-muted/30"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="capitalize font-medium">
                  {(item.key as string)?.replace('_', ' ')}
                </span>
                <span className="font-bold tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ─── TrainersTab ──────────────────────────────────────────────────────────────

function TrainersTab() {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const { dateFrom, dateTo } = getDateRange(preset);

  const { data, isLoading } = useGetReportsTrainers(
    { dateFrom, dateTo },
    { query: { staleTime: 300_000 } },
  );
  const trainers = ((data as any)?.data?.trainers ?? []) as Record<string, any>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Trainer Performance</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          <Star className="h-8 w-8 mx-auto mb-3 opacity-20" />
          No trainer data for this period.
        </div>
      ) : (
        <>
          {/* Rating chart */}
          <ChartCard title="Average Rating">
            <ResponsiveContainer
              width="100%"
              height={Math.max(160, trainers.length * 40)}
            >
              <BarChart
                data={trainers}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 0, left: 64 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="firstName"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string, i: number) =>
                    `${v} ${(trainers[i]?.lastName as string) ?? ''}`
                  }
                  width={64}
                />
                <Tooltip formatter={(v: number) => [v.toFixed(2), 'Avg Rating']} />
                <Bar
                  dataKey="ratingAvg"
                  fill={CHART_COLORS[0]}
                  radius={[0, 3, 3, 0]}
                >
                  {trainers.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Trainer cards */}
          <div className="space-y-3">
            {trainers.map((trainer: any) => (
              <div
                key={trainer.trainerId}
                className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">
                    {trainer.firstName} {trainer.lastName}
                  </p>
                  {trainer.email && (
                    <p className="text-xs text-muted-foreground">{trainer.email}</p>
                  )}
                  {(trainer.specializations as string[] | undefined)?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(trainer.specializations as string[]).slice(0, 4).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs capitalize px-2">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 text-sm shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {(trainer.ratingAvg as number ?? 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rating ({trainer.ratingCount ?? 0} reviews)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {trainer.currentClientCount ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {trainer.assignmentsInRange ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {trainer.notesInRange ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Session Notes</p>
                  </div>
                  {trainer.capacityUtilizationPct !== undefined && (
                    <div className="text-center">
                      <p className={`text-xl font-bold tabular-nums ${
                        (trainer.capacityUtilizationPct as number) >= 90
                          ? 'text-red-500'
                          : (trainer.capacityUtilizationPct as number) >= 70
                          ? 'text-amber-500'
                          : 'text-emerald-600'
                      }`}>
                        {(trainer.capacityUtilizationPct as number).toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business intelligence across members, revenue, attendance, and trainers"
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="revenue" className="mt-6">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersTab />
        </TabsContent>
        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="trainers" className="mt-6">
          <TrainersTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
