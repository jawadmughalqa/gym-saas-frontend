import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { EquipmentStatusBadge } from '@/components/shared/StatusBadge';
import { useTableState } from '@/hooks/use-table-state';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import {
  useGetEquipment,
  useDeleteEquipmentEquipmentId,
  getGetEquipmentQueryKey,
} from '@/api/generated/equipment/equipment';
import { useQueryClient } from '@tanstack/react-query';
import type { Equipment } from '@/api/generated/schemas/equipment';
import type { GetEquipmentStatus } from '@/api/generated/schemas/getEquipmentStatus';
import EquipmentForm from './components/EquipmentForm';

// ─── Condition badge ──────────────────────────────────────────────────────────

const CONDITION_VARIANT = {
  excellent: 'success',
  good: 'success',
  fair: 'warning',
  poor: 'destructive',
} as const;

function ConditionBadge({ condition }: { condition?: string }) {
  if (!condition) return <span className="text-muted-foreground text-sm">—</span>;
  const variant = CONDITION_VARIANT[condition as keyof typeof CONDITION_VARIANT] ?? 'secondary';
  return (
    <Badge variant={variant as 'success' | 'warning' | 'destructive' | 'secondary'} className="capitalize">
      {condition}
    </Badge>
  );
}

// ─── Equipment categories (common) ───────────────────────────────────────────

const CATEGORIES = [
  'cardio', 'strength', 'free weights', 'functional', 'flexibility',
  'group fitness', 'recovery', 'other',
];

// ─── EquipmentPage ────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<GetEquipmentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>();

  const { confirm, confirmProps } = useConfirm();
  const queryClient = useQueryClient();

  const params = {
    page: table.queryParams.page,
    limit: table.queryParams.limit,
    ...(table.queryParams.search ? { search: table.queryParams.search } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    ...(overdueOnly ? { overdueMaintenanceOnly: true } : {}),
  };

  const { data, isLoading } = useGetEquipment(params, {
    query: { placeholderData: (prev: unknown) => prev, staleTime: 1000 * 30 },
  });

  const deleteEquipment = useDeleteEquipmentEquipmentId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetEquipmentQueryKey() });
        toast({ title: 'Equipment deleted' });
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to delete equipment', description: getErrorMessage(err) }),
    },
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const equipmentList = data?.data ?? [];
  const pagination = data?.pagination;

  function handleEdit(eq: Equipment) {
    setEditingEquipment(eq);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditingEquipment(undefined);
    setFormOpen(true);
  }

  function handleDelete(eq: Equipment) {
    setDeletingId(eq._id ?? '');
    confirm(
      {
        title: `Delete ${eq.name}?`,
        description: 'This will permanently remove the equipment record and all associated maintenance logs.',
        variant: 'destructive',
        confirmLabel: 'Delete',
      },
      () => deleteEquipment.mutate({ equipmentId: eq._id ?? '' }),
    );
  }

  const columns: ColumnDef<Equipment>[] = [
    {
      key: 'name',
      header: 'Equipment',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand / Model',
      hideOnMobile: true,
      cell: (row) => (
        <div className="text-sm">
          <span>{row.brand ?? '—'}</span>
          {row.modelName && <span className="text-muted-foreground"> · {row.modelName}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <EquipmentStatusBadge status={row.status as 'operational' | 'under_maintenance' | 'out_of_service' | 'retired'} />,
    },
    {
      key: 'condition',
      header: 'Condition',
      hideOnMobile: true,
      cell: (row) => <ConditionBadge condition={row.condition} />,
    },
    {
      key: 'nextMaintenanceDue',
      header: 'Next Maintenance',
      hideOnMobile: true,
      cell: (row) => {
        if (!row.nextMaintenanceDue) return <span className="text-muted-foreground text-sm">—</span>;
        const due = new Date(row.nextMaintenanceDue);
        const isOverdue = due < new Date();
        return (
          <span className={`text-sm tabular-nums ${isOverdue ? 'text-destructive font-medium' : ''}`}>
            {due.toLocaleDateString()}
            {isOverdue && ' ⚠'}
          </span>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      cell: (row) => <span className="text-sm">{row.location ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-28',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {can('equipment.update') && (
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            >
              Edit
            </Button>
          )}
          {can('equipment.delete') && (
            <Button
              variant="ghost" size="sm"
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
        title="Equipment"
        subtitle="Manage gym equipment, maintenance schedules, and work orders"
        actions={
          can('equipment.create') && (
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search by name, brand, serial…"
          className="flex-1 max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as GetEquipmentStatus | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
            <SelectItem value="out_of_service">Out of Service</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => { setCategoryFilter(v); table.setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="overdueOnly"
            checked={overdueOnly}
            onCheckedChange={(v) => { setOverdueOnly(v); table.setPage(1); }}
          />
          <Label htmlFor="overdueOnly" className="text-sm cursor-pointer">Overdue maintenance</Label>
        </div>
      </div>

      {/* Table */}
      {!isLoading && equipmentList.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12" />}
          title="No equipment found"
          description={table.search ? 'Try adjusting your search or filters.' : 'Add your first piece of equipment to get started.'}
          action={can('equipment.create') ? { label: 'Add Equipment', onClick: handleAdd } : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={equipmentList}
            keyExtractor={(r) => r._id ?? ''}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
            onRowClick={(row) => navigate(`/equipment/${row._id}`)}
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

      <EquipmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipment={editingEquipment}
      />
      <ConfirmDialog
        {...confirmProps}
        loading={deleteEquipment.isPending && deletingId !== null}
      />
    </PageShell>
  );
}
