import { useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingDown } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { formatCurrencyCompact, formatCurrencyFull } from '@/utils/format';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { CHART_COLORS } from '@/lib/constants';
import { useGetReportsRevenue } from '@/api/generated/reports/reports';
import type { GetReportsRevenueGranularity } from '@/api/generated/schemas/getReportsRevenueGranularity';
import {
  getDateRange, granularityForPreset,
  DateRangeSelector, SectionTitle, ChartCard, ChartSkeleton, EmptyChart,
} from './ReportsShared';
import type { DatePreset } from './ReportsShared';

export default function RevenueTab({ branchId }: { branchId?: string }) {
  const { currency } = useTenantCurrency();
  const [preset, setPreset] = useState<DatePreset>('30d');
  const { dateFrom, dateTo } = getDateRange(preset);
  const granularity = granularityForPreset(preset) as GetReportsRevenueGranularity;

  const { data, isLoading } = useGetReportsRevenue(
    { dateFrom, dateTo, granularity, ...(branchId ? { branchId } : {}) },
    { query: { staleTime: 300_000 } },
  );
  const d = data?.data as Record<string, any> | undefined;

  const totals      = d?.totals    as Record<string, number> | undefined;
  const timeSeries  = (d?.timeSeries ?? []) as Record<string, any>[];
  const byMethod    = (d?.byMethod  ?? []) as Record<string, any>[];
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
        <StatCard title="Gross Revenue"   value={formatCurrencyCompact(totals?.grossRevenue  ?? 0, currency)} icon={DollarSign}   iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard title="Net Revenue"     value={formatCurrencyCompact(totals?.netRevenue    ?? 0, currency)} icon={DollarSign}   iconClassName="bg-green-500/10 text-green-600 dark:text-green-400" />
        <StatCard title="Total Refunded"  value={formatCurrencyCompact(totals?.totalRefunded ?? 0, currency)} icon={TrendingDown} iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Outstanding / Overdue */}
      {(outstanding || overdue) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {outstanding && outstanding.count > 0 && (
            <div className="rounded-xl border bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/25 dark:border-amber-800 p-5">
              <p className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrencyCompact(outstanding.totalAmount, currency)}</p>
              <p className="text-sm text-muted-foreground mt-1">{outstanding.count} invoices pending</p>
            </div>
          )}
          {overdue && overdue.count > 0 && (
            <div className="rounded-xl border bg-red-500/10 dark:bg-red-950/20 border-red-500/25 dark:border-red-800 p-5">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-1">Overdue</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">{formatCurrencyCompact(overdue.totalAmount, currency)}</p>
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
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCurrencyCompact(v, currency)} width={80} />
              <Tooltip formatter={(v: number) => [formatCurrencyFull(v, currency), 'Revenue']} />
              <Area type="monotone" dataKey="totalRevenue" stroke={CHART_COLORS[0]} fill="url(#revGrad)" strokeWidth={2} />
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
                <Tooltip formatter={(v: number) => formatCurrencyFull(v, currency)} />
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
                    <span className="font-semibold tabular-nums">{formatCurrencyCompact(item.total ?? 0, currency)}</span>
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
