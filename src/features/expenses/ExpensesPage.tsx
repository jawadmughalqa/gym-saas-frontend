import { useState, useEffect } from 'react';
import { Receipt, Plus, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useTableState } from '@/hooks/use-table-state';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/stores/auth.store';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useExpenses, useDeleteExpense } from './hooks/use-expenses';
import ExpenseForm, { CATEGORY_LABELS } from './components/ExpenseForm';
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/api/generated/expenses/expenses';
import { format } from 'date-fns';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<ExpenseStatus, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  paid:     'success',
  approved: 'secondary',
  pending:  'warning',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  paid:     'Paid',
  approved: 'Approved',
  pending:  'Pending',
  rejected: 'Rejected',
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

// ─── ExpensesPage ─────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });
  const isBranchManager = useAuthStore((s) => s.user?.role === 'branch_manager');

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const { confirm, confirmProps } = useConfirm();
  const deleteExpense = useDeleteExpense();

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  useEffect(() => {
    if (isBranchManager && branches.length > 0 && branchFilter === 'all') {
      setBranchFilter(branches[0]._id ?? 'all');
    }
  }, [isBranchManager, branches]);

  const query = {
    ...table.queryParams,
    ...(branchFilter !== 'all' ? { branchId: branchFilter } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter as ExpenseCategory } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter as ExpenseStatus } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const { data, isLoading } = useExpenses(query);

  function handleAdd() {
    setEditingExpense(undefined);
    setFormOpen(true);
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  function handleDelete(expense: Expense) {
    confirm(
      {
        title: 'Delete Expense?',
        description: `This will permanently delete "${expense.title}". This action cannot be undone.`,
        variant: 'destructive',
        confirmLabel: 'Delete',
      },
      () => deleteExpense.mutate({ expenseId: expense._id }),
    );
  }

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'title',
      header: 'Expense',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <span className="text-sm capitalize">
          {row.category === 'custom' && row.customCategory
            ? row.customCategory
            : (CATEGORY_LABELS[row.category] ?? row.category)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (row) => (
        <span className="tabular-nums font-medium">
          {formatCurrency(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.date), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-28',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {can('expense.update') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            >
              Edit
            </Button>
          )}
          {can('expense.delete') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Expenses"
        subtitle="Track and manage operational expenses across all branches"
        actions={
          can('expense.create') && (
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + Branch + Category + Status */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search expenses…"
            className="flex-1 min-w-[200px] max-w-sm"
          />

          {/* Branch dropdown */}
          <Select
            value={branchFilter}
            onValueChange={(v) => { setBranchFilter(v); table.setPage(1); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              {!isBranchManager && <SelectItem value="all">All branches</SelectItem>}
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => { setCategoryFilter(v); table.setPage(1); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); table.setPage(1); }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Date range */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm shrink-0 text-muted-foreground">From</Label>
            <DatePicker
              id="startDate"
              value={startDate}
              onChange={(v) => { setStartDate(v ?? ''); table.setPage(1); }}
              className="w-40 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm shrink-0 text-muted-foreground">To</Label>
            <DatePicker
              id="endDate"
              value={endDate}
              onChange={(v) => { setEndDate(v ?? ''); table.setPage(1); }}
              className="w-40 h-9 text-sm"
            />
          </div>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { setStartDate(''); setEndDate(''); table.setPage(1); }}
            >
              Clear dates
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {!isLoading && data?.data?.length === 0 ? (
        <EmptyState
          icon={<TrendingDown className="h-12 w-12" />}
          title="No expenses found"
          description={
            table.search || branchFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Start recording expenses to track your gym operational costs.'
          }
          action={can('expense.create') ? { label: 'Add Expense', onClick: handleAdd } : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(r) => r._id}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
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

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />
      <ConfirmDialog {...confirmProps} loading={deleteExpense.isPending} />
    </PageShell>
  );
}
