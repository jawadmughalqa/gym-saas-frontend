import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { formatApiDate } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset = '7d' | '30d' | '90d' | '6m' | '12m' | 'this_month';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDateRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  switch (preset) {
    case '7d':         return { dateFrom: formatApiDate(subDays(now, 7)),    dateTo: formatApiDate(now) };
    case '30d':        return { dateFrom: formatApiDate(subDays(now, 30)),   dateTo: formatApiDate(now) };
    case '90d':        return { dateFrom: formatApiDate(subDays(now, 90)),   dateTo: formatApiDate(now) };
    case '6m':         return { dateFrom: formatApiDate(subMonths(now, 6)),  dateTo: formatApiDate(now) };
    case '12m':        return { dateFrom: formatApiDate(subMonths(now, 12)), dateTo: formatApiDate(now) };
    case 'this_month': return { dateFrom: formatApiDate(startOfMonth(now)),  dateTo: formatApiDate(endOfMonth(now)) };
    default:           return { dateFrom: formatApiDate(subDays(now, 30)),   dateTo: formatApiDate(now) };
  }
}

export function granularityForPreset(preset: DatePreset): 'day' | 'week' | 'month' {
  if (preset === '7d' || preset === '30d' || preset === 'this_month') return 'day';
  if (preset === '90d') return 'week';
  return 'month';
}

// ─── Shared components ────────────────────────────────────────────────────────

export function GrowthBadge({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <span className="text-xs text-muted-foreground">vs last month: N/A</span>;
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{pct.toFixed(1)}% vs last month
    </span>
  );
}

export function DateRangeSelector({ value, onChange }: { value: DatePreset; onChange: (v: DatePreset) => void }) {
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

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

export function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-5 space-y-4 ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <div className="rounded-lg bg-muted animate-pulse" style={{ height }} />;
}

export function EmptyChart({ message = 'No data for this period.' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
      <BarChart2 className="h-4 w-4 mr-2 opacity-40" />
      {message}
    </div>
  );
}
