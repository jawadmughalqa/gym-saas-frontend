import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { CURRENCY } from '@/config/tenant.config';
import { useGetRefunds, getGetRefundsQueryKey } from '@/api/generated/refunds/refunds';
import type { Refund, RefundStatus } from '@/api/generated/refunds/refunds';
import { useQueryClient } from '@tanstack/react-query';
import { ReviewRefundDialog } from './components/ReviewRefundDialog';
import { useTableState } from '@/hooks/use-table-state';

// ─── Status badge ─────────────────────────────────────────────────────────────

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

// ─── Type badge ───────────────────────────────────────────────────────────────

function RefundTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <Badge variant="secondary" className="capitalize text-xs">
      {type === 'store_credit' ? 'Store Credit' : 'Cash'}
    </Badge>
  );
}

// ─── RefundsPage ──────────────────────────────────────────────────────────────

export default function RefundsPage() {
  const { can } = usePermission();
  const qc = useQueryClient();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [reviewRefund, setReviewRefund] = useState<Refund | null>(null);

  const params = {
    page: table.queryParams.page,
    limit: table.queryParams.limit,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useGetRefunds(params, {
    query: { placeholderData: (prev: unknown) => prev, staleTime: 1000 * 30 },
  });

  const refunds = (data as any)?.data ?? [];
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
              {m ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : '—'}
            </p>
            {m?.email && (
              <p className="text-xs text-muted-foreground">{m.email}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => {
        const currency = (row.paymentId as any)?.currency ?? CURRENCY;
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
            {u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '—'}
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
    <PageShell>
      <PageHeader
        title="Refunds"
        subtitle="Review and approve refund requests from staff"
      />

      {/* Filters */}
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

      {/* Table */}
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
              if (row.status === 'pending' && can('payment.refund')) {
                setReviewRefund(row);
              }
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
    </PageShell>
  );
}
