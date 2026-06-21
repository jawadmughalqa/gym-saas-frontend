import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import { formatCurrency } from '@/utils/format';
import {
  useGetSuperPaymentsSummary,
  useGetSuperTenants,
  type PaymentSummaryTenantRow,
} from '@/api/generated/super-admin/super-admin';

// ─── Date range presets ───────────────────────────────────────────────────────

type Preset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time' | 'custom';

function getPresetDates(preset: Preset): { startDate?: string; endDate?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') {
    return {
      startDate: new Date(y, m, 1).toISOString().split('T')[0],
      endDate:   new Date(y, m + 1, 0).toISOString().split('T')[0],
    };
  }
  if (preset === 'last_month') {
    return {
      startDate: new Date(y, m - 1, 1).toISOString().split('T')[0],
      endDate:   new Date(y, m, 0).toISOString().split('T')[0],
    };
  }
  if (preset === 'this_year') {
    return {
      startDate: new Date(y, 0, 1).toISOString().split('T')[0],
      endDate:   new Date(y, 11, 31).toISOString().split('T')[0],
    };
  }
  if (preset === 'last_year') {
    return {
      startDate: new Date(y - 1, 0, 1).toISOString().split('T')[0],
      endDate:   new Date(y - 1, 11, 31).toISOString().split('T')[0],
    };
  }
  return {}; // all_time / custom
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function PayStat({
  label, value, icon: Icon, iconClass, sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 shrink-0 ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SaasPaymentsTab ──────────────────────────────────────────────────────────

export default function SaasPaymentsTab() {
  const navigate = useNavigate();

  const [preset, setPreset]         = useState<Preset>('this_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Build query params
  const dateParams = preset === 'custom'
    ? { startDate: customStart || undefined, endDate: customEnd || undefined }
    : getPresetDates(preset);

  const params = {
    ...dateParams,
    ...(tenantFilter !== 'all' && { tenantId: tenantFilter }),
  };

  const { data: summaryData, isLoading } = useGetSuperPaymentsSummary(
    params,
    { query: { staleTime: 1000 * 60 } },
  );

  // Tenant list for the filter dropdown
  const { data: tenantsData } = useGetSuperTenants(
    { limit: 100 },
    { query: { staleTime: 1000 * 60 * 5 } },
  );

  const summary = summaryData?.data;
  const allTenants = tenantsData?.data ?? [];

  // Chart data — last 12 months max for readability
  const chartData = useMemo(() => {
    if (!summary?.monthlySeries) return [];
    return summary.monthlySeries.slice(-12).map((m) => ({
      month: m.month,
      Collected: m.collected,
      Billed: m.billed,
    }));
  }, [summary]);

  const fmt = (n: number) => formatCurrency(n, summary?.currency ?? 'PKR');

  // Per-tenant table columns
  const columns: ColumnDef<PaymentSummaryTenantRow>[] = [
    {
      key: 'businessName',
      header: 'Tenant',
      cell: (row) => (
        <button
          className="text-left font-medium hover:underline"
          onClick={() => navigate(`/super-admin/tenants/${row.tenantId}`)}
        >
          {row.businessName}
        </button>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (row) => {
        const cls: Record<string, string> = {
          starter: 'text-muted-foreground border-border',
          pro: 'text-purple-600 border-purple-300',
          enterprise: 'text-amber-600 border-amber-300',
        };
        return (
          <Badge variant="outline" className={`capitalize ${cls[row.plan] ?? ''}`}>
            {row.plan}
          </Badge>
        );
      },
    },
    {
      key: 'totalInvoices',
      header: 'Invoices',
      cell: (row) => <span className="tabular-nums">{row.totalInvoices}</span>,
    },
    {
      key: 'totalBilled',
      header: 'Billed',
      cell: (row) => <span className="tabular-nums font-medium">{fmt(row.totalBilled)}</span>,
    },
    {
      key: 'totalCollected',
      header: 'Collected',
      cell: (row) => (
        <span className="tabular-nums text-green-600 font-medium">{fmt(row.totalCollected)}</span>
      ),
    },
    {
      key: 'totalDue',
      header: 'Pending',
      cell: (row) => (
        <span className={`tabular-nums ${row.totalDue > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {fmt(row.totalDue)}
        </span>
      ),
    },
    {
      key: 'totalOverdue',
      header: 'Overdue',
      cell: (row) => (
        <span className={`tabular-nums ${row.totalOverdue > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
          {fmt(row.totalOverdue)}
        </span>
      ),
    },
    {
      key: 'lastPaidAt',
      header: 'Last Paid',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.lastPaidAt ? new Date(row.lastPaidAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'tenantId',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => navigate(`/super-admin/tenants/${row.tenantId}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5 mt-4">

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Period</p>
          <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {preset === 'custom' && (
          <>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">From</p>
              <Input
                type="date"
                className="h-9 w-40"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">To</p>
              <Input
                type="date"
                className="h-9 w-40"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Tenant</p>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="All tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {allTenants.map((t) => (
                <SelectItem key={t._id ?? ''} value={t._id ?? ''}>
                  {t.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <PayStat
          label="Total Collected"
          value={fmt(summary?.totalCollected ?? 0)}
          icon={TrendingUp}
          iconClass="bg-green-500 text-green-600"
          sub={`${summary?.invoiceCounts.paid ?? 0} invoices paid`}
        />
        <PayStat
          label="Total Billed"
          value={fmt(summary?.totalBilled ?? 0)}
          icon={CreditCard}
          iconClass="bg-blue-500 text-blue-600"
          sub={`${summary?.invoiceCounts.total ?? 0} total invoices`}
        />
        <PayStat
          label="Pending"
          value={fmt(summary?.totalDue ?? 0)}
          icon={Clock}
          iconClass="bg-amber-500 text-amber-600"
          sub={`${summary?.invoiceCounts.pending ?? 0} invoices`}
        />
        <PayStat
          label="Overdue"
          value={fmt(summary?.totalOverdue ?? 0)}
          icon={AlertTriangle}
          iconClass="bg-red-500 text-red-600"
          sub={`${summary?.invoiceCounts.overdue ?? 0} invoices`}
        />
      </div>

      {/* ── Invoice status badges ── */}
      {summary && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Invoice breakdown:</span>
          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
            {summary.invoiceCounts.paid} Paid
          </Badge>
          <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
            {summary.invoiceCounts.pending} Pending
          </Badge>
          <Badge variant="destructive" className="text-xs">
            {summary.invoiceCounts.overdue} Overdue
          </Badge>
          {summary.invoiceCounts.void > 0 && (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              {summary.invoiceCounts.void} Void
            </Badge>
          )}
        </div>
      )}

      {/* ── Monthly revenue chart ── */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={18} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const [yr, mo] = v.split('-');
                    const d = new Date(Number(yr), Number(mo) - 1);
                    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number) => [fmt(value), '']}
                  labelFormatter={(label: string) => {
                    const [yr, mo] = label.split('-');
                    return new Date(Number(yr), Number(mo) - 1)
                      .toLocaleString('default', { month: 'long', year: 'numeric' });
                  }}
                />
                <Legend />
                <Bar dataKey="Billed"    fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Per-tenant breakdown table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Per-Tenant Breakdown</span>
            {summary && (
              <span className="font-normal text-xs">
                {summary.tenants.length} tenant{summary.tenants.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && (!summary?.tenants || summary.tenants.length === 0) ? (
            <div className="p-6">
              <EmptyState
                icon={<TrendingDown className="h-10 w-10" />}
                title="No invoice data"
                description="No invoices found for the selected period."
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={summary?.tenants ?? []}
              keyExtractor={(row) => row.tenantId}
              loading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
