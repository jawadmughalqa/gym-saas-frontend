/**
 * BillingDashboard
 *
 * Production-grade finance dashboard layout:
 *   ┌──────────────────────────────────┬────────────────────┐
 *   │  5 Stat cards (full width)       │                    │
 *   ├──────────────────────┬───────────┤                    │
 *   │  Due Payments table  │  Recent   │                    │
 *   │  (2/3 width)         │  Txns     │                    │
 *   │                      │  (1/3)    │                    │
 *   └──────────────────────┴───────────┘
 *
 * Responsive:
 *   • ≥ lg  → side-by-side 2/3 + 1/3
 *   • < lg  → stacked, transactions panel below dues table
 *   • < sm  → single column, simplified table columns
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Clock, Wallet, AlertTriangle,
  Building2, RefreshCw, FilePlus, Search, ExternalLink,
  CheckCircle2, XCircle, MinusCircle, CreditCard, Eye,
  Phone, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import { formatCurrency, formatDate, formatRelative } from '@/utils/format';
import { usePermission } from '@/hooks/use-permission';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import InvoiceForm from './components/InvoiceForm';
import { MemberBillingDialog } from './components/MemberBillingDialog';
import { InvoicePaymentModal } from './components/InvoicePaymentModal';
import type { GetBillingRecentTransactions200DataItem } from '@/api/generated/schemas';
import { CURRENCY } from '@/config/tenant.config';

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
  cheque: 'Cheque', online: 'Online', jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa', other: 'Other',
};

const STATUS_TABS = [
  { value: 'all',             label: 'All Due' },
  { value: 'overdue',         label: 'Overdue' },
  { value: 'issued',          label: 'Issued' },
  { value: 'partially_paid',  label: 'Partial' },
] as const;

type StatusTab = typeof STATUS_TABS[number]['value'];
type SortField = 'memberName' | 'amountDue' | 'dueDate' | 'status' | 'invoiceNumber';
type SortDir   = 'asc' | 'desc';

// ─── Enriched invoice row shape ───────────────────────────────────────────────
// memberId and branchId are populated by the backend

interface PopulatedMember {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}
interface PopulatedBranch { _id: string; name: string; }

interface DueRow {
  _id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  memberId: PopulatedMember | string;
  branchId: PopulatedBranch | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberOf(row: DueRow): PopulatedMember | null {
  return row.memberId && typeof row.memberId === 'object' ? row.memberId as PopulatedMember : null;
}
function branchOf(row: DueRow): PopulatedBranch | null {
  return row.branchId && typeof row.branchId === 'object' ? row.branchId as PopulatedBranch : null;
}

function isOverdue(row: DueRow) {
  return row.status === 'overdue' || (
    row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'paid'
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    overdue:        { cls: 'bg-red-50 text-red-700 border-red-200',       label: 'Overdue' },
    partially_paid: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Partial' },
    issued:         { cls: 'bg-blue-50 text-blue-700 border-blue-200',    label: 'Issued' },
    draft:          { cls: 'bg-muted text-muted-foreground border-border', label: 'Draft' },
    paid:           { cls: 'bg-green-50 text-green-700 border-green-200', label: 'Paid' },
    void:           { cls: 'bg-muted text-muted-foreground border-border', label: 'Void' },
  };
  const c = cfg[status] ?? cfg['draft'];
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', c.cls)}>
      {c.label}
    </Badge>
  );
}

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

// ─── BillingDashboard ─────────────────────────────────────────────────────────

export default function BillingDashboard() {
  const navigate  = useNavigate();
  const { can }   = usePermission();

  // ── Global filters ─────────────────────────────────────────────────────────
  const [branchId,   setBranchId]   = useState('');
  const [formOpen,   setFormOpen]   = useState(false);

  // ── Dues table state ───────────────────────────────────────────────────────
  const [statusTab,  setStatusTab]  = useState<StatusTab>('all');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [sort,       setSort]       = useState<{ field: SortField; dir: SortDir }>({ field: 'dueDate', dir: 'asc' });
  const debouncedSearch             = useDebounce(search, 300);

  // ── Billing dialog ─────────────────────────────────────────────────────────
  const [billingTarget, setBillingTarget] = useState<{
    memberId: string; memberName: string; branchId: string;
  } | null>(null);

  // ── Invoice payment modal ──────────────────────────────────────────────────
  const [invoiceModalId, setInvoiceModalId] = useState<string | null>(null);

  const LIMIT = 15;

  // ── Branches ───────────────────────────────────────────────────────────────
  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  // ── Dashboard stats ────────────────────────────────────────────────────────
  const { data: dashData, isLoading: loadingStats, refetch: refetchStats } =
    useGetBillingDashboard(
      { ...(branchId ? { branchId } : {}) },
      { query: { staleTime: 1000 * 60 } },
    );
  const stats    = dashData?.data;
  const currency = stats?.currency ?? CURRENCY;

  // ── Due invoices ───────────────────────────────────────────────────────────
  const invoiceParams = {
    page,
    limit: LIMIT,
    ...(branchId  ? { branchId }   : {}),
    ...(debouncedSearch ? {} : {}),   // search is client-side (no backend search param)
    ...(statusTab === 'all'     ? { status: undefined }          : {}),
    ...(statusTab === 'overdue' ? { overdueOnly: true }          : { status: statusTab === 'all' ? undefined : statusTab }),
  };

  // Fetch all unpaid statuses when tab is 'all'
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

  // Client-side search + sort (search by name/invoice#/phone since backend doesn't support it)
  const filteredRows = useMemo(() => {
    let rows = [...rawInvoices];

    // Filter to only unpaid when tab is 'all'
    if (statusTab === 'all') {
      rows = rows.filter(r => ['issued', 'partially_paid', 'overdue'].includes(r.status));
    }

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      rows = rows.filter(r => {
        const m = memberOf(r);
        const name = m ? `${m.firstName} ${m.lastName}`.toLowerCase() : '';
        const phone = m?.phone ?? '';
        const inv = (r.invoiceNumber ?? '').toLowerCase();
        return name.includes(q) || inv.includes(q) || phone.includes(q);
      });
    }

    // Sort
    rows.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sort.field === 'memberName') {
        const ma = memberOf(a); const mb = memberOf(b);
        va = ma ? `${ma.firstName} ${ma.lastName}` : '';
        vb = mb ? `${mb.firstName} ${mb.lastName}` : '';
      } else if (sort.field === 'amountDue') {
        va = a.amountDue; vb = b.amountDue;
      } else if (sort.field === 'dueDate') {
        va = a.dueDate ?? ''; vb = b.dueDate ?? '';
      } else if (sort.field === 'status') {
        va = a.status; vb = b.status;
      } else if (sort.field === 'invoiceNumber') {
        va = a.invoiceNumber; vb = b.invoiceNumber;
      }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [rawInvoices, debouncedSearch, sort, statusTab]);

  // ── Recent transactions ────────────────────────────────────────────────────
  const { data: txData, isLoading: loadingTx, refetch: refetchTx } =
    useGetBillingRecentTransactions(
      { ...(branchId ? { branchId } : {}), limit: 20 },
      { query: { staleTime: 0, refetchInterval: 1000 * 30 } },
    );
  const transactions: GetBillingRecentTransactions200DataItem[] = txData?.data ?? [];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    );
  }

  function handleRefresh() {
    refetchStats();
    refetchInvoices();
    refetchTx();
  }

  function openBillingDialog(row: DueRow) {
    const m = memberOf(row);
    if (!m) return;
    setBillingTarget({
      memberId:    m._id,
      memberName:  `${m.firstName} ${m.lastName}`,
      branchId:    typeof row.branchId === 'object' ? (row.branchId as PopulatedBranch)._id : (row.branchId as string),
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* ── Page header ──────────────────────────────────────────────────── */}
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

      {/* ── Global toolbar ───────────────────────────────────────────────── */}
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

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loadingStats
          ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
          : (
            <>
              <StatCard
                title="Total Revenue"
                value={formatCurrency(stats?.totalRevenue ?? 0, currency)}
                icon={TrendingUp}
                iconClassName="bg-green-100 text-green-700"
                subtitle="Completed payments"
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
              <StatCard
                title="Salary Distributed"
                value={formatCurrency(stats?.salaryDistributed ?? 0, currency)}
                icon={TrendingDown}
                iconClassName="bg-purple-100 text-purple-700"
                subtitle="This period"
              />
              <StatCard
                title="Due Salaries"
                value={formatCurrency(stats?.dueSalaries ?? 0, currency)}
                icon={AlertTriangle}
                iconClassName={(stats?.dueSalaries ?? 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'}
                subtitle="Unpaid"
              />
            </>
          )
        }
      </div>

      {/* ── Main split layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ══ LEFT: Due Payments Table (2/3) ═══════════════════════════════ */}
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader className="pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Members with Due Payments</CardTitle>
                {pagination && (
                  <span className="text-xs text-muted-foreground">
                    {pagination.total} invoice{pagination.total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Status tabs */}
              <div className="flex gap-1 flex-wrap">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => { setStatusTab(tab.value); setPage(1); }}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                      statusTab === tab.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                    )}
                  >
                    {tab.label}
                    {tab.value === 'overdue' && (stats?.pendingFees ?? 0) > 0 && (
                      <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0 text-[10px]">!</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, invoice #, or phone…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <button className="flex items-center gap-1 text-left hover:text-foreground" onClick={() => handleSort('memberName')}>
                  Member <SortIcon field="memberName" sort={sort} />
                </button>
                <button className="flex items-center gap-1 w-24 hover:text-foreground" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" sort={sort} />
                </button>
                <button className="flex items-center gap-1 w-28 text-right justify-end hover:text-foreground" onClick={() => handleSort('amountDue')}>
                  Due <SortIcon field="amountDue" sort={sort} />
                </button>
                <button className="flex items-center gap-1 w-28 text-right justify-end hover:text-foreground" onClick={() => handleSort('dueDate')}>
                  Due Date <SortIcon field="dueDate" sort={sort} />
                </button>
                <div className="w-32 text-right">Actions</div>
              </div>

              {/* Rows */}
              {loadingInvoices ? (
                <div className="divide-y">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-7 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">All clear!</p>
                  <p className="text-xs text-muted-foreground mt-1">No due payments found.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRows.map(row => {
                    const member  = memberOf(row);
                    const branch  = branchOf(row);
                    const overdue = isOverdue(row);
                    const initials = member
                      ? `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()
                      : '?';

                    return (
                      <div
                        key={row._id}
                        className={cn(
                          'grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:gap-0 px-4 py-3 hover:bg-muted/30 transition-colors',
                          overdue && 'bg-red-50/40 hover:bg-red-50/60',
                        )}
                      >
                        {/* Member info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            overdue ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary',
                          )}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">
                                {member ? `${member.firstName} ${member.lastName}` : '—'}
                              </p>
                              {overdue && (
                                <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                              <span className="font-mono">{row.invoiceNumber}</span>
                              {branch && (
                                <>
                                  <span className="opacity-30">·</span>
                                  <span>{branch.name}</span>
                                </>
                              )}
                              {member?.phone && (
                                <>
                                  <span className="opacity-30">·</span>
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="h-2.5 w-2.5" />{member.phone}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center md:justify-center md:w-24">
                          <InvoiceStatusBadge status={row.status} />
                        </div>

                        {/* Amount due */}
                        <div className="flex items-center md:justify-end md:w-28 md:pr-4">
                          <div className="text-right">
                            <p className={cn(
                              'text-sm font-semibold',
                              overdue ? 'text-red-600' : 'text-foreground',
                            )}>
                              {formatCurrency(row.amountDue, row.currency || currency)}
                            </p>
                            {row.amountPaid > 0 && (
                              <p className="text-xs text-muted-foreground">
                                paid {formatCurrency(row.amountPaid, row.currency || currency)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Due date */}
                        <div className="flex items-center md:justify-end md:w-28 md:pr-4">
                          <p className={cn(
                            'text-xs',
                            overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
                          )}>
                            {row.dueDate ? formatDate(row.dueDate) : '—'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 md:justify-end md:w-32">
                          {can('payment.create') && member && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs px-2"
                              onClick={() => openBillingDialog(row)}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Collect
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => setInvoiceModalId(row._id)}
                            title="View invoice"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══ RIGHT: Recent Transactions (1/3) ═════════════════════════════ */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Live Transactions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-refreshes every 30s</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetchTx()}
                title="Refresh"
              >
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

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <InvoiceForm open={formOpen} onOpenChange={setFormOpen} />

      {billingTarget && (
        <MemberBillingDialog
          memberId={billingTarget.memberId}
          memberName={billingTarget.memberName}
          branchId={billingTarget.branchId}
          open={!!billingTarget}
          onOpenChange={(o) => { if (!o) { setBillingTarget(null); refetchInvoices(); refetchStats(); refetchTx(); } }}
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
