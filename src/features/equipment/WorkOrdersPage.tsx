import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { useTableState } from '@/hooks/use-table-state';
import { useGetWorkOrders } from '@/api/generated/work-orders/work-orders';
import type { WorkOrder } from '@/api/generated/schemas/workOrder';
import type { GetWorkOrdersStatus } from '@/api/generated/schemas/getWorkOrdersStatus';
import type { GetWorkOrdersPriority } from '@/api/generated/schemas/getWorkOrdersPriority';

// ─── Status badge ─────────────────────────────────────────────────────────────

const WO_STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  open: 'warning',
  in_progress: 'warning',
  pending_parts: 'secondary',
  resolved: 'success',
  cancelled: 'destructive',
};
const WO_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_parts: 'Pending Parts',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

const PRIORITY_VARIANT: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
};

// ─── WorkOrdersPage ───────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const navigate = useNavigate();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<GetWorkOrdersStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<GetWorkOrdersPriority | 'all'>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const params = {
    page: table.queryParams.page,
    limit: table.queryParams.limit,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
    ...(overdueOnly ? { overdueOnly: true } : {}),
  };

  const { data, isLoading } = useGetWorkOrders(params, {
    query: { placeholderData: (prev: unknown) => prev, staleTime: 1000 * 30 },
  });

  const workOrders: WorkOrder[] = data?.data ?? [];
  const pagination = data?.pagination;

  const columns: ColumnDef<WorkOrder>[] = [
    {
      key: 'title',
      header: 'Work Order',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'equipmentId',
      header: 'Equipment',
      hideOnMobile: true,
      cell: (row) => {
        const eq = row.equipmentId;
        if (!eq || typeof eq === 'string') return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="text-sm">
            <p className="font-medium">{eq.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{eq.category}</p>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      cell: (row) => row.priority ? (
        <Badge variant={PRIORITY_VARIANT[row.priority] ?? 'secondary'} className="capitalize">
          {row.priority}
        </Badge>
      ) : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge variant={WO_STATUS_VARIANT[row.status ?? ''] ?? 'secondary'}>
          {WO_STATUS_LABEL[row.status ?? ''] ?? row.status}
        </Badge>
      ),
    },
    {
      key: 'dueAt',
      header: 'Due Date',
      hideOnMobile: true,
      cell: (row) => {
        if (!row.dueAt) return <span className="text-muted-foreground text-sm">—</span>;
        const due = new Date(row.dueAt);
        const isOverdue = due < new Date() && row.status !== 'resolved' && row.status !== 'cancelled';
        return (
          <span className={`text-sm tabular-nums ${isOverdue ? 'text-destructive font-medium' : ''}`}>
            {due.toLocaleDateString()}
            {isOverdue && ' ⚠'}
          </span>
        );
      },
    },
    {
      key: 'estimatedCost',
      header: 'Est. Cost',
      hideOnMobile: true,
      cell: (row) => row.estimatedCost != null ? (
        <span className="text-sm tabular-nums">
          {row.currency} {row.estimatedCost.toLocaleString()}
        </span>
      ) : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Work Orders"
        subtitle="Track and manage equipment repair and maintenance requests"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as GetWorkOrdersStatus | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_parts">Pending Parts</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => { setPriorityFilter(v as GetWorkOrdersPriority | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="overdueOnly"
            checked={overdueOnly}
            onCheckedChange={(v) => { setOverdueOnly(v); table.setPage(1); }}
          />
          <Label htmlFor="overdueOnly" className="text-sm cursor-pointer">Overdue only</Label>
        </div>
      </div>

      {/* Table */}
      {!isLoading && workOrders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No work orders found"
          description="Work orders are created from within an equipment detail page."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={workOrders}
            keyExtractor={(r) => r._id ?? ''}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
            onRowClick={(row) => {
              const eqId = typeof row.equipmentId === 'string'
                ? row.equipmentId
                : row.equipmentId?._id;
              if (eqId) navigate(`/equipment/${eqId}`);
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
    </PageShell>
  );
}
