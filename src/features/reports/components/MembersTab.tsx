import { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { CHART_COLORS } from '@/lib/constants';
import { useGetReportsMembers } from '@/api/generated/reports/reports';
import type { GetReportsMembersGranularity } from '@/api/generated/schemas/getReportsMembersGranularity';
import {
  getDateRange, granularityForPreset,
  DateRangeSelector, SectionTitle, ChartCard, ChartSkeleton, EmptyChart,
} from './ReportsShared';
import type { DatePreset } from './ReportsShared';

export default function MembersTab() {
  const [preset, setPreset] = useState<DatePreset>('6m');
  const { dateFrom, dateTo } = getDateRange(preset);
  const granularity = granularityForPreset(preset) as GetReportsMembersGranularity;

  const { data, isLoading } = useGetReportsMembers(
    { dateFrom, dateTo, granularity, includeChurn: true },
    { query: { staleTime: 300_000 } },
  );
  const d = data?.data as Record<string, any> | undefined;

  const newMembersData = (d?.newMembersOverTime          ?? []) as Record<string, any>[];
  const byStatus       = (d?.byStatus                    ?? []) as Record<string, any>[];
  const byGender       = (d?.byGender                    ?? []) as Record<string, any>[];
  const byPlan         = (d?.activeSubscriptionsByPlan   ?? []) as Record<string, any>[];
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
