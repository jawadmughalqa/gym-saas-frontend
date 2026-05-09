import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import Pagination from '@/components/shared/Pagination';
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useTableState } from '@/hooks/use-table-state';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatCurrency } from '@/utils/format';
import { useInvoices, useVoidInvoice } from './hooks/use-billing';
import InvoiceForm from './components/InvoiceForm';
import type { Invoice, InvoiceStatus } from '@/types/billing.types';

// ─── InvoicesPage ─────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);

  const { confirm, confirmProps } = useConfirm();

  const voidMutation = useVoidInvoice(voidingInvoice?._id ?? '', {
    onSuccess: () => setVoidingInvoice(null),
  });

  const query = {
    ...table.queryParams,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useInvoices(query);

  function handleVoid(inv: Invoice) {
    setVoidingInvoice(inv);
    confirm(
      {
        title: `Void ${inv.invoiceNumber}?`,
        description: 'This will permanently void the invoice. This action cannot be undone.',
        variant: 'destructive',
        confirmLabel: 'Void Invoice',
      },
      () => voidMutation.mutate({ reason: 'Voided by staff' }),
    );
  }

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium font-mono text-sm">{row.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">
            {row.memberId.firstName} {row.memberId.lastName}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{formatCurrency(row.total, row.currency)}</p>
          {row.amountDue > 0 && row.status !== 'paid' && (
            <p className="text-xs text-muted-foreground">
              Due: {formatCurrency(row.amountDue, row.currency)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => row.dueDate
        ? <span className={row.status === 'overdue' ? 'text-destructive font-medium' : ''}>
            {formatDate(row.dueDate)}
          </span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-20',
      cell: (row) =>
        can('invoice.void') && ['issued', 'partially_paid', 'overdue'].includes(row.status) ? (
          <div className="flex justify-end">
            <Button
              variant="ghost" size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleVoid(row); }}
            >
              Void
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Invoices"
        subtitle="Manage billing invoices and payments"
        actions={
          can('invoice.create') && (
            <Button onClick={() => setFormOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search by invoice number or member…"
          className="flex-1 max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as InvoiceStatus | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && data?.invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No invoices found"
          description={
            table.search ? 'Try adjusting your search or filters.' : 'Create your first invoice to get started.'
          }
          action={can('invoice.create') ? { label: 'New Invoice', onClick: () => setFormOpen(true) } : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.invoices ?? []}
            keyExtractor={(r) => r._id}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
            onRowClick={(row) => navigate(`/billing/${row._id}`)}
          />
          {data?.pagination && (
            <Pagination
              meta={data.pagination}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
            />
          )}
        </>
      )}

      <InvoiceForm open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog {...confirmProps} loading={voidMutation.isPending} />
    </PageShell>
  );
}
