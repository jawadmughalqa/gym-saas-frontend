import { useState, useMemo } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, DollarSign, TrendingUp, Wrench, ClipboardList,
  UserCheck, Star, Activity, AlertCircle,
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

const formatPKR = (value: number) => {
  if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `PKR ${(value / 1_000).toFixed(1)}K`;
  return `PKR ${value.toLocaleString()}`;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Date range helper ────────────────────────────────────────────────────────

type DatePreset = '7d' | '30d' | '90d' | '6m' | '12m' | 'this_month';

function getDateRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case '7d':        return { dateFrom: fmt(subDays(now, 7)), dateTo: fmt(now) };
    case '30d':       return { dateFrom: fmt(subDays(now, 30)), dateTo: fmt(now) };
    case '90d':       return { dateFrom: fmt(subDays(now, 90)), dateTo: fmt(now) };
    case '6m':        return { dateFrom: fmt(subMonths(now, 6)), dateTo: fmt(now) };
    case '12m':       return { dateFrom: fmt(subMonths(now, 12)), dateTo: fmt(now) };
    case 'this_month': return { dateFrom: fmt(startOfMonth(now)), dateTo: fmt(endOfMonth(now)) };
    default:           return { dateFrom: fmt(subDays(now, 30)), dateTo: fmt(now) };
  }
}

function granularityForPreset(preset: DatePreset): 'day' | 'week' | 'month' {
  if (preset === '7d' || preset === '30d' || preset === 'this_month') return 'day';
  if (preset === '90d') return 'week';
  return 'month';
}

// ─── DateRangeSelector ────────────────────────────────────────────────────────

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DatePreset;
  onChange: (v: DatePreset) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DatePreset)}>
      <SelectTrigger className="w-36">
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

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{children}</h3>;
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return <div className="h-64 rounded-lg bg-muted animate-pulse" />;
}

// ─── DashboardTab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useGetReportsDashboard(undefined, {
    query: { staleTime: 1000 * 60 },
  });
  
  const dashboardData = data?.data;

  return (
    <div className="space-y-6">
      <SectionTitle>Members</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={isLoading ? '—' : String(dashboardData?.members?.total ?? 0)}
          icon={Users}
        />
        <StatCard
          title="Active Members"
          value={isLoading ? '—' : String(dashboardData?.members?.active ?? 0)}
          icon={UserCheck}
          iconClassName="bg-green-500/10"
        />
        <StatCard
          title="New This Month"
          value={isLoading ? '—' : String(dashboardData?.members?.newThisMonth ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Subscriptions"
          value={isLoading ? '—' : String(dashboardData?.subscriptions?.active ?? 0)}
          icon={ClipboardList}
          iconClassName="bg-blue-500/10"
        />
      </div>

      <SectionTitle>Check-ins</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Today's Check-ins"
          value={isLoading ? '—' : String(dashboardData?.checkIns?.today ?? 0)}
          icon={Activity}
          iconClassName="bg-purple-500/10"
        />
        <StatCard
          title="This Month Check-ins"
          value={isLoading ? '—' : String(dashboardData?.checkIns?.thisMonth ?? 0)}
          icon={Activity}
          iconClassName="bg-purple-500/10"
        />
      </div>

      <SectionTitle>Finance</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Revenue This Month"
          value={isLoading ? '—' : formatPKR(dashboardData?.revenue?.thisMonth ?? 0)}
          icon={DollarSign}
          iconClassName="bg-green-500/10"
        />
        <StatCard
          title="Revenue Last Month"
          value={isLoading ? '—' : formatPKR(dashboardData?.revenue?.lastMonth ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Monthly Growth"
          value={isLoading ? '—' : dashboardData?.revenue?.growthVsLastMonthPct === null 
            ? 'N/A' 
            : `${(dashboardData?.revenue?.growthVsLastMonthPct ?? 0) > 0 ? '+' : ''}${(dashboardData?.revenue?.growthVsLastMonthPct ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          iconClassName={(dashboardData?.revenue?.growthVsLastMonthPct ?? 0) > 0 
            ? 'bg-green-500/10' 
            : (dashboardData?.revenue?.growthVsLastMonthPct ?? 0) < 0 
            ? 'bg-red-500/10' 
            : undefined}
        />
      </div>

      <SectionTitle>Operations & Alerts</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Overdue Invoices"
          value={isLoading ? '—' : String(dashboardData?.alerts?.overdueInvoices ?? 0)}
          icon={AlertCircle}
          iconClassName={(dashboardData?.alerts?.overdueInvoices ?? 0) > 0 ? 'bg-red-500/10' : undefined}
        />
        <StatCard
          title="Open Work Orders"
          value={isLoading ? '—' : String(dashboardData?.alerts?.openWorkOrders ?? 0)}
          icon={ClipboardList}
          iconClassName={(dashboardData?.alerts?.openWorkOrders ?? 0) > 0 ? 'bg-yellow-500/10' : undefined}
        />
        <StatCard
          title="Equipment Under Maintenance"
          value={isLoading ? '—' : String(dashboardData?.alerts?.equipmentUnderMaintenance ?? 0)}
          icon={Wrench}
          iconClassName={(dashboardData?.alerts?.equipmentUnderMaintenance ?? 0) > 0 ? 'bg-orange-500/10' : undefined}
        />
      </div>

      {/* Optional: Display last generated timestamp */}
      {dashboardData?.generatedAt && (
        <div className="text-right text-xs text-muted-foreground">
          Last updated: {format(new Date(dashboardData.generatedAt), 'MMM dd, yyyy h:mm a')}
        </div>
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
    { query: { staleTime: 1000 * 60 * 5 } },
  );
  const d = data?.data;

  const totals = d?.totals;
  const timeSeries = d?.timeSeries ?? [];
  const byMethod = d?.byMethod ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Revenue Overview</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Gross Revenue"
          value={formatPKR(totals?.grossRevenue ?? 0)}
          icon={DollarSign}
          iconClassName="bg-green-500/10"
        />
        <StatCard
          title="Net Revenue"
          value={formatPKR(totals?.netRevenue ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Total Refunded"
          value={formatPKR(totals?.totalRefunded ?? 0)}
          icon={TrendingUp}
          iconClassName="bg-yellow-500/10"
        />
      </div>

      {/* Time series */}
      <div className="rounded-lg border p-4 space-y-3">
        <SectionTitle>Revenue Over Time</SectionTitle>
        {isLoading ? (
          <ChartSkeleton />
        ) : timeSeries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatPKR(v)} />
              <Tooltip formatter={(v: number) => [formatPKR(v as number), 'Revenue']} />
              <Area type="monotone" dataKey="totalRevenue" stroke={CHART_COLORS[0]} fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By payment method */}
      {byMethod.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>By Payment Method</SectionTitle>
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
                  {byMethod.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatPKR(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>Method Breakdown</SectionTitle>
            <div className="space-y-2">
              {byMethod.map((item, i) => (
                <div key={item.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="capitalize">{item.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatPKR(item.total ?? 0)}</span>
                    <span className="text-muted-foreground ml-2">({item.count} txns)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outstanding / Overdue */}
      {(d?.outstanding || d?.overdue) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {d.outstanding && (
            <div className="rounded-lg border p-4 space-y-2">
              <SectionTitle>Outstanding</SectionTitle>
              <p className="text-2xl font-bold">{formatPKR(d.outstanding.totalAmount ?? 0)}</p>
              <p className="text-sm text-muted-foreground">{d.outstanding.count} invoices pending</p>
            </div>
          )}
          {d.overdue && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <SectionTitle>Overdue</SectionTitle>
              <p className="text-2xl font-bold text-destructive">{formatPKR(d.overdue.totalAmount ?? 0)}</p>
              <p className="text-sm text-muted-foreground">{d.overdue.count} overdue invoices</p>
            </div>
          )}
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
    { query: { staleTime: 1000 * 60 * 5 } },
  );
  const d = data?.data;

  const newMembersData = d?.newMembersOverTime ?? [];
  const byStatus = d?.byStatus ?? [];
  const byGender = d?.byGender ?? [];
  const byPlan = d?.activeSubscriptionsByPlan ?? [];
  const churn = d?.churn;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Member Analytics</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* New members over time */}
      <div className="rounded-lg border p-4 space-y-3">
        <SectionTitle>New Members Over Time</SectionTitle>
        {isLoading ? (
          <ChartSkeleton />
        ) : newMembersData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data for this period.</p>
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
      </div>

      {/* Status + Gender breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2">
        {byStatus.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>Members by Status</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="key" cx="50%" cy="50%" outerRadius={70}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(v: string) => v} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {byGender.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>Members by Gender</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byGender} dataKey="count" nameKey="key" cx="50%" cy="50%" outerRadius={70}>
                  {byGender.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Active subscriptions by plan */}
      {byPlan.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <SectionTitle>Active Subscriptions by Plan</SectionTitle>
          <div className="space-y-2">
            {byPlan.map((item) => (
              <div key={item.planId} className="flex items-center gap-3">
                <div className="flex-1 text-sm truncate">{item.planName ?? item.planId}</div>
                <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${Math.min(100, ((item.count ?? 0) / (byPlan[0]?.count ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-medium tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Churn */}
      {churn && (
        <div className="rounded-lg border p-4 space-y-2">
          <SectionTitle>Churn</SectionTitle>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold">{churn.churned ?? 0}</p>
              <p className="text-sm text-muted-foreground">members churned</p>
            </div>
            <Badge variant={churn.churnRate && churn.churnRate > 5 ? 'destructive' : 'secondary'} className="mb-1">
              {((churn.churnRate ?? 0)).toFixed(1)}% churn rate
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
    { query: { staleTime: 1000 * 60 * 5 } },
  );
  const d = data?.data;

  const byPeriod = d?.byPeriod ?? [];
  const byDayOfWeek = useMemo(
    () => (d?.byDayOfWeek ?? []).map((item) => ({
      ...item,
      name: DAY_NAMES[item.dayOfWeek ?? 0],
    })),
    [d],
  );
  const byHour = d?.byHourOfDay ?? [];
  const byMethod = d?.byMethod ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Attendance Analytics</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total Check-Ins"
          value={String(d?.totalCheckIns ?? 0)}
          icon={Activity}
        />
        <StatCard
          title="Unique Members"
          value={String(d?.uniqueMemberCount ?? 0)}
          icon={Users}
        />
      </div>

      {/* Check-ins over time */}
      <div className="rounded-lg border p-4 space-y-3">
        <SectionTitle>Check-Ins Over Time</SectionTitle>
        {isLoading ? (
          <ChartSkeleton />
        ) : byPeriod.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={byPeriod} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'Check-Ins']} />
              <Area type="monotone" dataKey="checkIns" stroke={CHART_COLORS[2]} fill="url(#attendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* By day of week + By hour */}
      <div className="grid gap-4 sm:grid-cols-2">
        {byDayOfWeek.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>By Day of Week</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDayOfWeek} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {byHour.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>By Hour of Day</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byHour} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="hourOfDay"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}:00`}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v: number) => `${v}:00`} />
                <Bar dataKey="count" fill={CHART_COLORS[4]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By method */}
      {byMethod.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <SectionTitle>Check-In Method</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {byMethod.map((item, i) => (
              <div
                key={item.key}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="capitalize">{item.key?.replace('_', ' ')}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
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
    { query: { staleTime: 1000 * 60 * 5 } },
  );
  const trainers = (data as any)?.data?.trainers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle>Trainer Performance</SectionTitle>
        <DateRangeSelector value={preset} onChange={setPreset} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No trainer data for this period.
        </div>
      ) : (
        <>
          {/* Ratings bar chart */}
          <div className="rounded-lg border p-4 space-y-3">
            <SectionTitle>Average Rating</SectionTitle>
            <ResponsiveContainer width="100%" height={Math.max(160, trainers.length * 36)}>
              <BarChart
                data={trainers}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 0, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="firstName"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string, i: number) =>
                    `${v} ${trainers[i]?.lastName ?? ''}`
                  }
                  width={60}
                />
                <Tooltip formatter={(v: number) => [v.toFixed(2), 'Avg Rating']} />
                <Bar dataKey="ratingAvg" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trainer cards */}
          <div className="space-y-3">
            {trainers.map((trainer) => (
              <div
                key={trainer.trainerId}
                className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="font-medium">
                    {trainer.firstName} {trainer.lastName}
                  </p>
                  {trainer.specializations && trainer.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {trainer.specializations.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs capitalize">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{(trainer.ratingAvg ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Rating ({trainer.ratingCount} reviews)</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{trainer.currentClientCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{trainer.assignmentsInRange ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{trainer.notesInRange ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Session Notes</p>
                  </div>
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
        <TabsList className="flex-wrap h-auto gap-1">
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