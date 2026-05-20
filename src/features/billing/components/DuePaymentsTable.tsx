import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, CreditCard, Eye,
  CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, Phone,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

// ─── Types (exported so BillingDashboard can reuse) ───────────────────────────

export interface PopulatedMember { _id: string; firstName: string; lastName: string; email?: string; phone?: string; }
export interface PopulatedBranch { _id: string; name: string; }

export interface DueRow {
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

export type SortField = 'memberName' | 'amountDue' | 'dueDate' | 'status' | 'invoiceNumber';
export type SortDir   = 'asc' | 'desc';
export type StatusTab = 'all' | 'overdue' | 'issued' | 'partially_paid';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_TABS = [
  { value: 'all',            label: 'All Due' },
  { value: 'overdue',        label: 'Overdue' },
  { value: 'issued',         label: 'Issued' },
  { value: 'partially_paid', label: 'Partial' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function memberOf(row: DueRow): PopulatedMember | null {
  return row.memberId && typeof row.memberId === 'object' ? row.memberId as PopulatedMember : null;
}
export function branchOf(row: DueRow): PopulatedBranch | null {
  return row.branchId && typeof row.branchId === 'object' ? row.branchId as PopulatedBranch : null;
}
export function isOverdue(row: DueRow) {
  return row.status === 'overdue' || (
    row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'paid'
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    overdue:        { cls: 'bg-red-50 text-red-700 border-red-200',         label: 'Overdue' },
    partially_paid: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Partial' },
    issued:         { cls: 'bg-blue-50 text-blue-700 border-blue-200',      label: 'Issued' },
    draft:          { cls: 'bg-muted text-muted-foreground border-border',   label: 'Draft' },
    paid:           { cls: 'bg-green-50 text-green-700 border-green-200',   label: 'Paid' },
    void:           { cls: 'bg-muted text-muted-foreground border-border',   label: 'Void' },
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rows: DueRow[];
  loading: boolean;
  pagination: any;
  statusTab: StatusTab;
  search: string;
  sort: { field: SortField; dir: SortDir };
  page: number;
  currency: string;
  pendingFees?: number;
  canCollect: boolean;
  onSort: (field: SortField) => void;
  onStatusTab: (v: StatusTab) => void;
  onSearch: (v: string) => void;
  onPage: (fn: (p: number) => number) => void;
  onCollect: (row: DueRow) => void;
  onViewInvoice: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DuePaymentsTable({
  rows, loading, pagination, statusTab, search, sort, page, currency,
  pendingFees, canCollect, onSort, onStatusTab, onSearch, onPage,
  onCollect, onViewInvoice,
}: Props) {
  return (
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
              onClick={() => onStatusTab(tab.value as StatusTab)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                statusTab === tab.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50',
              )}
            >
              {tab.label}
              {tab.value === 'overdue' && (pendingFees ?? 0) > 0 && (
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
            onChange={e => { onSearch(e.target.value); onPage(() => 1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <button className="flex items-center gap-1 text-left hover:text-foreground" onClick={() => onSort('memberName')}>
            Member <SortIcon field="memberName" sort={sort} />
          </button>
          <button className="flex items-center gap-1 w-24 hover:text-foreground" onClick={() => onSort('status')}>
            Status <SortIcon field="status" sort={sort} />
          </button>
          <button className="flex items-center gap-1 w-28 text-right justify-end hover:text-foreground" onClick={() => onSort('amountDue')}>
            Due <SortIcon field="amountDue" sort={sort} />
          </button>
          <button className="flex items-center gap-1 w-28 text-right justify-end hover:text-foreground" onClick={() => onSort('dueDate')}>
            Due Date <SortIcon field="dueDate" sort={sort} />
          </button>
          <div className="w-32 text-right">Actions</div>
        </div>

        {/* Rows */}
        {loading ? (
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
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All clear!</p>
            <p className="text-xs text-muted-foreground mt-1">No due payments found.</p>
          </div>
        ) : (
          <div className="divide-y">
            {rows.map(row => {
              const member   = memberOf(row);
              const branch   = branchOf(row);
              const overdue  = isOverdue(row);
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
                      <p className={cn('text-sm font-semibold', overdue ? 'text-red-600' : 'text-foreground')}>
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
                    <p className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                      {row.dueDate ? formatDate(row.dueDate) : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 md:justify-end md:w-32">
                    {canCollect && member && (
                      <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={() => onCollect(row)}>
                        <CreditCard className="h-3 w-3 mr-1" />
                        Collect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => onViewInvoice(row._id)}
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
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => onPage(p => p - 1)}>
                Prev
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pagination.pages} onClick={() => onPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
