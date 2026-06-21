import { useState } from 'react';
import { RotateCcw, Banknote, Landmark, ArrowDownToLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { useGetRefunds, getGetRefundsQueryKey } from '@/api/generated/refunds/refunds';
import type { Refund, RefundStatus } from '@/api/generated/refunds/refunds';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ReviewRefundDialog } from './components/ReviewRefundDialog';
import { useTableState } from '@/hooks/use-table-state';
import { api } from '@/lib/axios';
import type { WalletPayout } from '@/types/member.types';

// ─── Shared status/type badges ────────────────────────────────────────────────

const STATUS_VARIANT: Record<RefundStatus, 'warning' | 'success' | 'destructive'> = {
  pending:  'warning',
  approved: 'success',
  rejected: 'destructive',
};

function RefundStatusBadge({ status }: { status?: RefundStatus }) {
  if (!status) return null;
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status}
    </Badge>
  );
}

function RefundTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <Badge variant="secondary" className="capitalize text-xs">
      {type === 'store_credit' ? 'Store Credit' : 'Cash'}
    </Badge>
  );
}

// ─── Payment Refunds tab ──────────────────────────────────────────────────────

function PaymentRefundsTab() {
  const { can } = usePermission();
  const qc = useQueryClient();
  const { currency: tenantCurrency } = useTenantCurrency();
  const table = useTableState({ defaultLimit: 20 });
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [reviewRefund, setReviewRefund] = useState<Refund | null>(null);

  const params = {
    page:  table.queryParams.page,
    limit: table.queryParams.limit,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useGetRefunds(params, {
    query: { placeholderData: (prev: unknown) => prev, staleTime: 0 },
  });

  const refunds    = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  function handleReviewSuccess() {
    void qc.invalidateQueries({ queryKey: getGetRefundsQueryKey() });
  }

  const columns: ColumnDef<Refund>[] = [
    {
      key: 'member',
      header: 'Member',
      cell: (row) => {
        const m = row.memberId;
        return (
          <div>
            <p className="font-medium text-sm">
              {m ? `${(m as any).firstName ?? ''} ${(m as any).lastName ?? ''}`.trim() : '—'}
            </p>
            {(m as any)?.email && (
              <p className="text-xs text-muted-foreground">{(m as any).email}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => {
        const currency = (row.paymentId as any)?.currency ?? tenantCurrency;
        return (
          <div>
            <p className="font-semibold">{formatCurrency(row.amount ?? 0, currency)}</p>
            <RefundTypeBadge type={row.type} />
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      hideOnMobile: true,
      cell: (row) => (
        <p className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.reason}>
          {row.reason ?? '—'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <RefundStatusBadge status={row.status} />,
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      hideOnMobile: true,
      cell: (row) => {
        const u = row.requestedBy;
        return (
          <span className="text-sm">
            {u ? `${(u as any).firstName ?? ''} ${(u as any).lastName ?? ''}`.trim() : '—'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      hideOnMobile: true,
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdAt ? formatDateTime(row.createdAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-28',
      cell: (row) => {
        if (row.status !== 'pending') return null;
        if (!can('payment.refund')) return null;
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setReviewRefund(row); }}
          >
            Review
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as RefundStatus | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && refunds.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-12 w-12" />}
          title="No refund requests"
          description={
            statusFilter !== 'all'
              ? 'No refunds match the selected filter.'
              : 'Refund requests will appear here when submitted.'
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={refunds}
            keyExtractor={(r) => r._id ?? ''}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
            onRowClick={(row) => {
              if (row.status === 'pending' && can('payment.refund')) setReviewRefund(row);
            }}
          />
          {pagination && (
            <Pagination
              meta={pagination}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
            />
          )}
        </>
      )}

      <ReviewRefundDialog
        open={!!reviewRefund}
        onOpenChange={(o) => { if (!o) setReviewRefund(null); }}
        refund={reviewRefund}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}

// ─── Wallet payouts tab ───────────────────────────────────────────────────────

interface PayoutRow extends WalletPayout {
  memberId: WalletPayout['memberId'] | { _id: string; firstName: string; lastName: string; email: string };
  processedBy: WalletPayout['processedBy'] | { _id: string; firstName: string; lastName: string };
}

function WalletPayoutsTab() {
  const table = useTableState({ defaultLimit: 20 });
  const { currency: tenantCurrency } = useTenantCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ['wallet-payouts-all', table.queryParams.page, table.queryParams.limit],
    queryFn: async () => {
      const res = await api.get('/members/wallet/payouts', {
        params: { page: table.queryParams.page, limit: table.queryParams.limit },
      });
      return res.data;
    },
    placeholderData: (prev: unknown) => prev,
    staleTime: 0,
  });

  const payouts: PayoutRow[] = (data as any)?.data ?? [];
  const pagination             = (data as any)?.pagination;

  // Summary stats
  const totalCash  = payouts.reduce((s, p) => s + (p.medium === 'cash'          ? p.amount : 0), 0);
  const totalBank  = payouts.reduce((s, p) => s + (p.medium === 'bank_transfer' ? p.amount : 0), 0);
  const totalAll   = totalCash + totalBank;

  const columns: ColumnDef<PayoutRow>[] = [
    {
      key: 'member',
      header: 'Member',
      cell: (row) => {
        const m = row.memberId as any;
        const name = m?.firstName ? `${m.firstName} ${m.lastName ?? ''}`.trim() : String(row.memberId);
        return (
          <div>
            <p className="font-medium text-sm">{name}</p>
            {m?.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className="font-semibold text-emerald-700">
          {formatCurrency(row.amount, tenantCurrency)}
        </span>
      ),
    },
    {
      key: 'medium',
      header: 'Medium',
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm">
          {row.medium === 'cash'
            ? <><Banknote className="h-3.5 w-3.5 text-muted-foreground" /> Cash</>
            : <><Landmark  className="h-3.5 w-3.5 text-muted-foreground" /> Bank Transfer</>}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      hideOnMobile: true,
      cell: (row) => (
        <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.notes}>
          {row.notes ?? '—'}
        </p>
      ),
    },
    {
      key: 'processedBy',
      header: 'Processed By',
      hideOnMobile: true,
      cell: (row) => {
        const u = row.processedBy as any;
        const name = u?.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : String(row.processedBy);
        return <span className="text-sm">{name}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards — shown when there's data */}
      {payouts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Paid Out',    value: totalAll,  icon: <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> },
            { label: 'Cash Payouts',      value: totalCash, icon: <Banknote className="h-4 w-4 text-emerald-600" /> },
            { label: 'Bank Transfers',    value: totalBank, icon: <Landmark  className="h-4 w-4 text-emerald-600" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <p className="text-xs text-emerald-700 font-medium">{label}</p>
              </div>
              <p className="text-lg font-bold text-emerald-800">
                {formatCurrency(value, tenantCurrency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && payouts.length === 0 ? (
        <EmptyState
          icon={<ArrowDownToLine className="h-12 w-12" />}
          title="No wallet payouts yet"
          description="Wallet payouts appear here when a gym owner returns credit to a member."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={payouts}
            keyExtractor={(r) => r._id}
            loading={isLoading}
            skeletonRows={10}
          />
          {pagination && (
            <Pagination
              meta={pagination}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── RefundsPage ──────────────────────────────────────────────────────────────

export default function RefundsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Refunds & Payouts"
        subtitle="Track payment refund requests and wallet payouts to members"
      />

      <Tabs defaultValue="refunds">
        <TabsList className="mb-4">
          <TabsTrigger value="refunds">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Payment Refunds
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
            Wallet Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="refunds">
          <PaymentRefundsTab />
        </TabsContent>

        <TabsContent value="payouts">
          <WalletPayoutsTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
