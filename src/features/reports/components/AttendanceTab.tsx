import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Activity } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { CHART_COLORS } from '@/lib/constants';
import { useGetReportsAttendance } from '@/api/generated/reports/reports';
import type { GetReportsAttendanceGranularity } from '@/api/generated/schemas/getReportsAttendanceGranularity';
import {
  DAY_NAMES, getDateRange, granularityForPreset,
  DateRangeSelector, SectionTitle, ChartCard, ChartSkeleton, EmptyChart,
} from './ReportsShared';
import type { DatePreset } from './ReportsShared';

export default function AttendanceTab() {
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
        <StatCard title="Total Check-Ins"  value={String(d?.totalCheckIns     ?? 0)} icon={Activity} iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
        <StatCard title="Unique Members"   value={String(d?.uniqueMemberCount ?? 0)} icon={Users}    iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
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
              <Area type="monotone" dataKey="checkIns" stroke={CHART_COLORS[2]} fill="url(#attendGrad)" strokeWidth={2} />
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
                <XAxis dataKey="hourOfDay" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}:00`} />
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
