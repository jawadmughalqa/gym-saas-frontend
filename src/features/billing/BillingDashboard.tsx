/**
 * BillingDashboard
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │  4 Stat cards (full width)       │
 *   ├──────────────────────┬───────────┤
 *   │  Due Payments table  │  Recent   │
 *   │  (2/3 width)         │  Txns     │
 *   │                      │  (1/3)    │
 *   └──────────────────────┴───────────┘
 *
 * Responsive:
 *   • ≥ lg  → side-by-side 2/3 + 1/3
 *   • < lg  → stacked
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Clock, Wallet, Building2, RefreshCw, FilePlus,
  ExternalLink, CheckCircle2, XCircle, MinusCircle, RefreshCw as RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import { useGetBranches } from '@/api/generated/branches/branches';
import {
  useGetBillingDashboard,
  useGetBillingRecentTransactions,
} from '@/api/generated/billing/billing';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { formatCurrency, formatRelative } from '@/utils/format';
import { usePermission } from '@/hooks/use-permission';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import InvoiceForm from './components/InvoiceForm';
import { MemberBillingDialog } from './components/MemberBillingDialog';
import { InvoicePaymentModal } from './components/InvoicePaymentModal';
import DuePaymentsTable, {
  type DueRow, type SortField, type SortDir, type StatusTab, type PopulatedBranch,
  memberOf,
} from './components/DuePaymentsTable';
import type { GetBillingRecentTransactions200DataItem } from '@/api/generated/schemas';
import { CURRENCY } from '@/config/tenant.config';

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', online: 'Online', jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa', other: 'Other',
};

// ─── Small local components ───────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3"><Skeleton className="h-4 w-28" /></CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function TxSettlementBadge({ status }: { status?: string }) {
  if (status === 'fully_paid') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        <CheckCircle2 className="h-2.5 w-2.5" /> Fully Paid
      </span>
    );
  }
  if (status === 'partial_paid') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
        <MinusCircle className="h-2.5 w-2.5" /> Partial Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <XCircle className="h-2.5 w-2.5" /> Pending
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingDashboard() {
  const navigate = useNavigate();
  const { can }  = usePermission();

  // ── Global filters ─────────────────────────────────────────────────────────
  const [branchId, setBranchId] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  // ── Dues table state ───────────────────────────────────────────────────────
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [sort,      setSort]      = useState<{ field: SortField; dir: SortDir }>({ field: 'dueDate', dir: 'asc' });
  const debouncedSearch           = useDebounce(search, 300);

  // ── Billing dialog ─────────────────────────────────────────────────────────
  const [billingTarget, setBillingTarget] = useState<{
    memberId: string; memberName: string; branchId: string;
  } | null>(null);

  // ── Invoice payment modal ──────────────────────────────────────────────────
  const [invoiceModalId, setInvoiceModalId] = useState<string | null>(null);

  const LIMIT = 15;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const { data: dashData, isLoading: loadingStats, refetch: refetchStats } =
    useGetBillingDashboard(
      { ...(branchId ? { branchId } : {}) },
      { query: { staleTime: 1000 * 60 } },
    );
  const stats    = dashData?.data;
  const currency = stats?.currency ?? CURRENCY;

  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } =
    useGetInvoices(
      statusTab === 'all'
        ? { page, limit: LIMIT, ...(branchId ? { branchId } : {}) }
        : statusTab === 'overdue'
          ? { page, limit: LIMIT, overdueOnly: true, ...(branchId ? { branchId } : {}) }
          : { page, limit: LIMIT, status: statusTab as any, ...(branchId ? { branchId } : {}) },
      { query: { staleTime: 1000 * 30 } },
    );

  const rawInvoices: DueRow[] = (invoicesData as any)?.data ?? [];
  const pagination = (invoicesData as any)?.pagination;

  // Client-side search + sort
  const filteredRows = useMemo(() => {
    let rows = [...rawInvoices];

    if (statusTab === 'all') {
      rows = rows.filter(r => ['issued', 'partially_paid', 'overdue'].includes(r.status));
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      rows = rows.filter(r => {
        const m = memberOf(r);
        const name  = m ? `${m.firstName} ${m.lastName}`.toLowerCase() : '';
        const phone = m?.phone ?? '';
        const inv   = (r.invoiceNumber ?? '').toLowerCase();
        return name.includes(q) || inv.includes(q) || phone.includes(q);
      });
    }

    rows.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      const ma = memberOf(a); const mb = memberOf(b);
      if      (sort.field === 'memberName')    { va = ma ? `${ma.firstName} ${ma.lastName}` : ''; vb = mb ? `${mb.firstName} ${mb.lastName}` : ''; }
      else if (sort.field === 'amountDue')     { va = a.amountDue;    vb = b.amountDue; }
      else if (sort.field === 'dueDate')       { va = a.dueDate ?? ''; vb = b.dueDate ?? ''; }
      else if (sort.field === 'status')        { va = a.status;       vb = b.status; }
      else if (sort.field === 'invoiceNumber') { va = a.invoiceNumber; vb = b.invoiceNumber; }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ?  1 : -1;
      return 0;
    });

    return rows;
  }, [rawInvoices, debouncedSearch, sort, statusTab]);

  const { data: txData, isLoading: loadingTx, refetch: refetchTx } =
    useGetBillingRecentTransactions(
      { ...(branchId ? { branchId } : {}), limit: 20 },
      { query: { staleTime: 0, refetchInterval: 1000 * 30 } },
    );
  const transactions: GetBillingRecentTransactions200DataItem[] = txData?.data ?? [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    );
  }

  function handleRefresh() {
    refetchStats(); refetchInvoices(); refetchTx();
  }

  function openBillingDialog(row: DueRow) {
    const m = memberOf(row);
    if (!m) return;
    setBillingTarget({
      memberId:   m._id,
      memberName: `${m.firstName} ${m.lastName}`,
      branchId:   typeof row.branchId === 'object' ? (row.branchId as PopulatedBranch)._id : (row.branchId as string),
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageShell>
      {/* ── Page header ────────────────────────────────────────────────── */}
      <PageHeader
        title="Billing Dashboard"
        subtitle="Due payments, live transactions, and revenue overview"
        action={
          can('invoice.create') ? (
            <Button onClick={() => setFormOpen(true)} size="sm">
              <FilePlus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          ) : undefined
        }
      />

      {/* ── Global toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Branch
          </Label>
          <Select
            value={branchId || 'all'}
            onValueChange={(v) => { setBranchId(v === 'all' ? '' : v); setPage(1); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" className="self-end" onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="self-end text-muted-foreground text-xs"
          onClick={() => navigate('/billing/invoices')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          All Invoices
        </Button>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : (
            <>
              <StatCard
                title="Total Revenue"
                value={formatCurrency(stats?.totalRevenue ?? 0, currency)}
                icon={TrendingUp}
                iconClassName="bg-green-100 text-green-700"
                subtitle="Net after refunds"
              />
              <StatCard
                title="Total Refunds"
                value={formatCurrency((stats as any)?.totalRefunds ?? 0, currency)}
                icon={RotateCcw}
                iconClassName={(stats as any)?.totalRefunds > 0 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}
                subtitle="Refunded to members"
              />
              <StatCard
                title="Pending Fees"
                value={formatCurrency(stats?.pendingFees ?? 0, currency)}
                icon={Clock}
                iconClassName={(stats?.pendingFees ?? 0) > 0 ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'}
                subtitle="Outstanding invoices"
              />
              <StatCard
                title="Today's Collection"
                value={formatCurrency(stats?.todayCollection ?? 0, currency)}
                icon={Wallet}
                iconClassName="bg-blue-100 text-blue-700"
                subtitle="Received today"
              />
            </>
          )
        }
      </div>

      {/* ── Main split layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── LEFT: Due Payments Table (2/3) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <DuePaymentsTable
            rows={filteredRows}
            loading={loadingInvoices}
            pagination={pagination}
            statusTab={statusTab}
            search={search}
            sort={sort}
            page={page}
            currency={currency}
            overdueCount={(stats as any)?.overdueCount}
            canCollect={can('payment.create')}
            onSort={handleSort}
            onStatusTab={(v) => { setStatusTab(v); setPage(1); }}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onPage={setPage}
            onCollect={openBillingDialog}
            onViewInvoice={setInvoiceModalId}
          />
        </div>

        {/* ── RIGHT: Recent Transactions (1/3) ───────────────────────── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Live Transactions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-refreshes every 30s</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchTx()} title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loadingTx ? (
                <div className="divide-y">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3 px-4 py-3">
                      <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-14" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <Wallet className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-22rem)] overflow-y-auto">
                  {transactions.map(tx => {
                    const txCurrency = tx.currency ?? currency;
                    return (
                      <div
                        key={tx._id}
                        className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group border-b last:border-b-0"
                        onClick={() => tx.invoiceId && setInvoiceModalId(tx.invoiceId)}
                      >
                        {/* Row 1: Avatar + name + status badge */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 uppercase',
                            tx.invoiceStatus === 'fully_paid'   ? 'bg-green-100 text-green-700' :
                            tx.invoiceStatus === 'partial_paid' ? 'bg-orange-100 text-orange-700' :
                                                                  'bg-red-100 text-red-700',
                          )}>
                            {(tx.memberName ?? '?').charAt(0)}
                          </div>
                          <p className="flex-1 text-xs font-semibold truncate group-hover:text-primary transition-colors">
                            {tx.memberName ?? '—'}
                          </p>
                          <TxSettlementBadge status={tx.invoiceStatus} />
                        </div>

                        {/* Row 2: Invoice # + method + time */}
                        <div className="flex items-center gap-2 mt-1.5 ml-9 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {tx.invoiceNumber ?? '—'}
                          </span>
                          {tx.method && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border">
                              {METHOD_LABELS[tx.method] ?? tx.method}
                            </Badge>
                          )}
                          {(tx.paymentCount ?? 0) > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              {tx.paymentCount} payments
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {tx.paidAt ? formatRelative(tx.paidAt) : '—'}
                          </span>
                        </div>

                        {/* Row 3: Amount breakdown */}
                        {(tx.invoiceTotal ?? 0) > 0 && (
                          <div className="mt-1.5 ml-9 grid grid-cols-3 gap-1 bg-muted/30 rounded px-2 py-1.5">
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p>
                              <p className="text-[10px] font-semibold tabular-nums">
                                {formatCurrency(tx.invoiceTotal ?? 0, txCurrency)}
                              </p>
                            </div>
                            <div className="text-center border-x border-border/50">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Paid</p>
                              <p className="text-[10px] font-semibold tabular-nums text-green-700">
                                {formatCurrency(tx.invoiceAmountPaid ?? 0, txCurrency)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Remaining</p>
                              <p className={cn(
                                'text-[10px] font-semibold tabular-nums',
                                (tx.invoiceAmountDue ?? 0) > 0 ? 'text-red-600' : 'text-green-700',
                              )}>
                                {formatCurrency(tx.invoiceAmountDue ?? 0, txCurrency)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2 border-t bg-muted/20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground"
                  onClick={() => navigate('/billing/invoices')}
                >
                  View all invoices
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <InvoiceForm open={formOpen} onOpenChange={setFormOpen} />

      {billingTarget && (
        <MemberBillingDialog
          memberId={billingTarget.memberId}
          memberName={billingTarget.memberName}
          branchId={billingTarget.branchId}
          open={!!billingTarget}
          onOpenChange={(o) => {
            if (!o) { setBillingTarget(null); refetchInvoices(); refetchStats(); refetchTx(); }
          }}
        />
      )}

      <InvoicePaymentModal
        invoiceId={invoiceModalId}
        open={!!invoiceModalId}
        onOpenChange={(o) => { if (!o) setInvoiceModalId(null); }}
        onPaymentRecorded={() => { refetchInvoices(); refetchStats(); refetchTx(); }}
      />
    </PageShell>
  );
}
