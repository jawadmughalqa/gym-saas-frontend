import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useExpenseSummary, useExpenseAnalytics } from './hooks/use-expenses';
import { CATEGORY_LABELS } from './components/ExpenseForm';
import { TrendingDown, Building2, ListOrdered, Calendar } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function formatCurrency(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString();
}

// ─── ExpenseAnalyticsPage ─────────────────────────────────────────────────────

export default function ExpenseAnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const summaryParams = {
    year: selectedYear,
    ...(selectedMonth !== 'all' ? { month: parseInt(selectedMonth, 10) } : {}),
    ...(branchFilter !== 'all' ? { branchId: branchFilter } : {}),
  };

  const analyticsParams = {
    months: 12,
    ...(branchFilter !== 'all' ? { branchId: branchFilter } : {}),
  };

  const { data: summaryData, isLoading: summaryLoading } = useExpenseSummary(summaryParams);
  const { data: analyticsData } = useExpenseAnalytics(analyticsParams);

  const summary = summaryData?.data;
  const analytics = analyticsData?.data;

  // Monthly trend chart data — fill gaps with 0 for months with no expenses
  const monthlyTrendData = MONTHS.map((name, i) => {
    const month = i + 1;
    const found = summary?.monthlyTrend?.find((m) => m.month === month);
    return { name: name.slice(0, 3), total: found?.total ?? 0, count: found?.count ?? 0 };
  });

  // Category chart data
  const categoryData =
    (summary?.categoryBreakdown ?? []).map((c) => ({
      name: CATEGORY_LABELS[c.category] ?? c.category,
      total: c.total,
      count: c.count,
    }));

  // Branch comparison (from analytics)
  const branchData = analytics?.branchComparison ?? [];

  // Monthly spend trend from analytics (12 months)
  const spendTrendData = (analytics?.monthlySpend ?? []).map((m) => ({
    name: `${MONTHS[m.month - 1]?.slice(0, 3)} ${m.year}`,
    total: m.total,
    count: m.count,
  }));

  return (
    <PageShell>
      <PageHeader
        title="Expense Analytics"
        subtitle="Overview of operational costs across branches and categories"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Month</Label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branch</Label>
          <Select
            value={branchFilter}
            onValueChange={setBranchFilter}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Expenses"
          value={summaryLoading ? '…' : `PKR ${formatCurrency(summary?.total ?? 0)}`}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Transactions"
          value={summaryLoading ? '…' : String(summary?.count ?? 0)}
          icon={<ListOrdered className="h-4 w-4" />}
        />
        <StatCard
          label="Avg per Transaction"
          value={
            summaryLoading
              ? '…'
              : summary && summary.count > 0
              ? `PKR ${formatCurrency(Math.round(summary.total / summary.count))}`
              : '—'
          }
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Top Category"
          value={
            summaryLoading
              ? '…'
              : summary?.categoryBreakdown?.[0]
              ? CATEGORY_LABELS[summary.categoryBreakdown[0].category] ?? summary.categoryBreakdown[0].category
              : '—'
          }
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {/* Monthly trend chart (full year) */}
      {selectedMonth === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spend — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${formatCurrency(v)}`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Total']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {categoryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Total']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Breakdown list */}
                <div className="mt-2 space-y-1.5">
                  {categoryData.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        PKR {formatCurrency(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Branch comparison */}
        {branchFilter === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branch Comparison (Last 12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {branchData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  No branch data available
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={branchData.map((b) => ({ name: b.branchName, total: b.total }))}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrency(v)}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Total']}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-2 space-y-1.5">
                    {branchData.map((b) => (
                      <div key={b.branchId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {b.branchName}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{b.count} expenses</Badge>
                          <span className="font-medium tabular-nums">
                            PKR {formatCurrency(b.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Last 12 months trend (from analytics) */}
      {spendTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">12-Month Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spendTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={(v: number) => [`PKR ${v.toLocaleString()}`, 'Total']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
