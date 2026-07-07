import { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, CreditCard, Dumbbell, TrendingUp, ArrowRight,
  CheckCircle2, AlertCircle, CalendarDays, SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { useGetReportsDashboard } from '@/api/generated/reports/reports';
import { useGetBillingDashboard } from '@/api/generated/billing/billing';
import { useGetReportsRevenue } from '@/api/generated/reports/reports';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { formatApiDate, formatCurrencyCompact, formatDate } from '@/utils/format';

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1; // 1-based

const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

const MONTHS = [
  { value: '0',  label: 'Full Year' },
  { value: '1',  label: 'January' },
  { value: '2',  label: 'February' },
  { value: '3',  label: 'March' },
  { value: '4',  label: 'April' },
  { value: '5',  label: 'May' },
  { value: '6',  label: 'June' },
  { value: '7',  label: 'July' },
  { value: '8',  label: 'August' },
  { value: '9',  label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const QUICK_LINKS = [
  { label: 'View Members',  href: '/members',  icon: Users },
  { label: 'View Trainers', href: '/trainers', icon: Dumbbell },
  { label: 'View Billing',  href: '/billing',  icon: CreditCard },
  { label: 'View Reports',  href: '/reports',  icon: TrendingUp },
];


/** Given year + month (1-based, or 0 = full year), return ISO dateFrom/dateTo strings */
function getDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  if (month === 0) {
    // Full year
    return {
      dateFrom: formatApiDate(startOfYear(new Date(year, 0, 1))),
      dateTo: formatApiDate(endOfYear(new Date(year, 0, 1))),
    };
  }
  const d = new Date(year, month - 1, 1);
  return { dateFrom: formatApiDate(startOfMonth(d)), dateTo: formatApiDate(endOfMonth(d)) };
}

// ─── PaymentSummaryCard ───────────────────────────────────────────────────────

function PaymentSummaryCard() {
  const user = useAuthStore((s) => s.user);
  const isBranchManager = user?.role === 'branch_manager';
  const { currency, locale } = useTenantCurrency();

  const [year, setYear]       = useState<number>(CURRENT_YEAR);
  const [month, setMonth]     = useState<string>(String(CURRENT_MONTH));
  const [branchId, setBranchId] = useState<string>('all');
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>(formatApiDate(subDays(new Date(), 30)));
  const [customTo, setCustomTo]   = useState<string>(formatApiDate(new Date()));

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  // Auto-select first branch for BMs (no "All Branches" option)
  useEffect(() => {
    if (isBranchManager && branches.length > 0 && branchId === 'all') {
      setBranchId(branches[0]._id ?? 'all');
    }
  }, [isBranchManager, branches]);

  // Compute date range
  const { dateFrom, dateTo } = useMemo(() => {
    if (customMode) return { dateFrom: customFrom, dateTo: customTo };
    return getDateRange(year, parseInt(month, 10));
  }, [customMode, customFrom, customTo, year, month]);

  // Billing dashboard totals
  const billingParams = {
    dateFrom,
    dateTo,
    ...(branchId !== 'all' ? { branchId } : {}),
  };

  const { data: billingData, isLoading: billingLoading } =
    useGetBillingDashboard(billingParams, { query: { staleTime: 0, refetchOnMount: true } });

  const billing = billingData?.data;

  // Revenue time series for chart — monthly granularity
  const revenueParams = {
    dateFrom,
    dateTo,
    granularity: 'month' as const,
    ...(branchId !== 'all' ? { branchId } : {}),
  };

  const { data: revenueData, isLoading: chartLoading } =
    useGetReportsRevenue(revenueParams, { query: { staleTime: 0, refetchOnMount: true } });

  const timeSeries = ((revenueData?.data as any)?.timeSeries ?? []) as Array<{
    period: string;
    totalRevenue: number;
    paymentCount: number;
  }>;

  const chartData = timeSeries.map((row) => ({
    name: row.period?.slice(0, 7) ?? '',          // "2026-05"
    label: row.period
      ? format(new Date(row.period), 'MMM yy')
      : row.period,
    total: row.totalRevenue ?? 0,
  }));

  // When a single month is selected and there's no time-series data yet,
  // synthesise a single bar from the billing total
  const displayChart =
    chartData.length > 0
      ? chartData
      : billing?.totalRevenue != null && billing.totalRevenue > 0
      ? [{ name: dateFrom.slice(0, 7), label: format(new Date(dateFrom), 'MMM yy'), total: billing.totalRevenue }]
      : [];

  const periodLabel = customMode
    ? `${dateFrom} → ${dateTo}`
    : parseInt(month, 10) === 0
    ? `Full Year ${year}`
    : `${MONTHS.find((m) => m.value === month)?.label} ${year}`;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Payment Summary</CardTitle>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
      </CardHeader>
      <Separator />

      {/* ── Filters ── */}
      <div className="px-6 pt-4 pb-2 flex flex-wrap gap-3 items-end">
        {!customMode ? (
          <>
            {/* Year */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            {/* Custom From */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
              <DatePicker
                value={customFrom}
                maxDate={customTo || undefined}
                onChange={(v) => setCustomFrom(v ?? '')}
                className="h-8"
              />
            </div>
            {/* Custom To */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
              <DatePicker
                value={customTo}
                minDate={customFrom || undefined}
                onChange={(v) => setCustomTo(v ?? '')}
                className="h-8"
              />
            </div>
          </>
        )}

        {/* Branch */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!isBranchManager && <SelectItem value="all">All Branches</SelectItem>}
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom range toggle */}
        <Button
          variant={customMode ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setCustomMode((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {customMode ? 'Custom On' : 'Custom Range'}
        </Button>
      </div>

      <CardContent className="pt-2 space-y-5">
        {/* ── Stat numbers ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {billingLoading ? (
            <>
              <div className="rounded-lg border p-4 space-y-2 animate-pulse">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="rounded-lg border p-4 space-y-2 animate-pulse">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-3 w-28 rounded bg-muted" />
              </div>
              <div className="rounded-lg border p-4 space-y-2 animate-pulse">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
            </>
          ) : (
            <>
              {/* Total Collected */}
              <div className="rounded-lg border bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/25 dark:border-emerald-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">
                    Total Collected
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-500 dark:text-emerald-300">
                  {formatCurrencyCompact(billing?.totalRevenue ?? 0, currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Payments received</p>
              </div>

              {/* Total Due */}
              <div className="rounded-lg border bg-red-500/10 dark:bg-red-950/20 border-red-500/25 dark:border-red-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span className="text-xs font-medium text-red-500 dark:text-red-400">
                    Total Due
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-red-500 dark:text-red-300">
                  {formatCurrencyCompact(billing?.pendingFees ?? 0, currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Outstanding invoices</p>
              </div>

              {/* Today's Collection */}
              <div className="rounded-lg border bg-blue-500/10 dark:bg-blue-950/20 border-blue-500/25 dark:border-blue-800 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
                    Today's Collection
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-blue-500 dark:text-blue-300">
                  {formatCurrencyCompact(billing?.todayCollection ?? 0, currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Received today</p>
              </div>
            </>
          )}
        </div>

        {/* ── Bar chart ── */}
        {chartLoading ? (
          <div className="h-44 rounded-lg bg-muted animate-pulse" />
        ) : displayChart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-sm text-muted-foreground gap-2">
            <CreditCard className="h-8 w-8 opacity-20" />
            No payment data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displayChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrencyCompact(v, currency, locale)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                formatter={(v: number) => [`${currency} ${v.toLocaleString()}`, 'Collected']}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isBranchManager = user?.role === 'branch_manager';
  const { currency, locale } = useTenantCurrency();

  const today = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // For branch managers, scope KPI cards to their first branch.
  // useGetBranches is already scoped server-side to the BM's assigned branches.
  const { data: bmBranchesData } = useGetBranches(
    { limit: 10 },
    { query: { enabled: isBranchManager } },
  );
  const bmFirstBranch = isBranchManager ? (bmBranchesData?.data?.[0] ?? null) : null;
  const bmBranchId    = bmFirstBranch?._id ?? undefined;
  const bmBranchName  = (bmFirstBranch as any)?.name ?? null;

  // Reports dashboard — KPI cards
  const { data: dashData, isLoading: dashLoading } = useGetReportsDashboard(
    // Branch managers are scoped to their branch; owners get the whole tenant
    bmBranchId ? { branchId: bmBranchId } : undefined,
    { query: { staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true } },
  );
  const d = dashData?.data as Record<string, any> | undefined;
  const members      = d?.members      ?? {};
  const revenue      = d?.revenue      ?? {};
  const trainers     = d?.trainers     ?? {};

  // Alerts — `d.alerts.expiringSoon` doesn't exist on the backend;
  // the real field is `d.subscriptions.expiringSoon`
  const overdueInvoices    = (d?.alerts?.overdueInvoices     ?? 0) as number;
  const expiringSoon       = (d?.subscriptions?.expiringSoon ?? 0) as number;
  const openWorkOrders     = (d?.alerts?.openWorkOrders      ?? 0) as number;

  const membersSubtitle = isBranchManager
    ? (bmBranchName ? `At ${bmBranchName}` : 'At your branch')
    : 'Across all branches';

  return (
    <PageShell>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={today}
      />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Active Members"
              value={String(members.active ?? 0)}
              icon={Users}
              iconClassName="bg-primary/10 text-primary"
              subtitle={membersSubtitle}
            />
            <StatCard
              title="Revenue This Month"
              value={formatCurrencyCompact(revenue.thisMonth ?? 0, currency, locale)}
              icon={CreditCard}
              iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              subtitle="Invoices paid"
            />
            <StatCard
              title="Active Trainers"
              value={String(trainers.active ?? 0)}
              icon={Dumbbell}
              iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-400"
              subtitle="Currently assigned"
            />
            <StatCard
              title="New This Month"
              value={String(members.newThisMonth ?? 0)}
              icon={TrendingUp}
              iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              subtitle="New members"
            />
          </>
        )}
      </div>

      {/* ── Main body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Summary — takes 2/3 width */}
        <PaymentSummaryCard />

        {/* Quick Access — takes 1/3 width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Access</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-1.5">
            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={href} href={href}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </CardContent>

          {/* Alerts strip */}
          {!dashLoading && d && (
            <>
              <Separator />
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Alerts
                </p>
                {overdueInvoices > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overdue invoices</span>
                    <Badge variant="destructive" className="text-xs">
                      {overdueInvoices}
                    </Badge>
                  </div>
                )}
                {expiringSoon > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expiring soon</span>
                    <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-500">
                      {expiringSoon}
                    </Badge>
                  </div>
                )}
                {openWorkOrders > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open work orders</span>
                    <Badge variant="outline" className="text-xs">
                      {openWorkOrders}
                    </Badge>
                  </div>
                )}
                {overdueInvoices === 0 && expiringSoon === 0 && openWorkOrders === 0 && (
                  <p className="text-xs text-muted-foreground">All clear — no alerts</p>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ── Role / session info ── */}
      {user && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Logged in as</span>
              <Badge variant="secondary" className="capitalize font-medium">
                {user.role?.replace(/_/g, ' ')}
              </Badge>
              {user.tenantId && (
                <>
                  <span className="opacity-40">·</span>
                  <span>
                    Tenant ID:{' '}
                    <code className="text-xs bg-muted rounded px-1 py-0.5">{user.tenantId}</code>
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
