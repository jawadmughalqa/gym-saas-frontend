import { useState } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CHART_COLORS } from '@/lib/constants';
import { useGetReportsTrainers } from '@/api/generated/reports/reports';
import {
  DatePreset, getDateRange,
  DateRangeSelector, SectionTitle, ChartCard,
} from './ReportsShared';

export default function TrainersTab() {
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
            <ResponsiveContainer width="100%" height={Math.max(160, trainers.length * 40)}>
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
                <Bar dataKey="ratingAvg" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]}>
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
                  <p className="font-semibold">{trainer.firstName} {trainer.lastName}</p>
                  {trainer.email && (
                    <p className="text-xs text-muted-foreground">{trainer.email}</p>
                  )}
                  {(trainer.specializations as string[] | undefined)?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(trainer.specializations as string[]).slice(0, 4).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs capitalize px-2">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-6 text-sm shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {(trainer.ratingAvg as number ?? 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Rating ({trainer.ratingCount ?? 0} reviews)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">{trainer.currentClientCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">{trainer.assignmentsInRange ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums">{trainer.notesInRange ?? 0}</p>
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
