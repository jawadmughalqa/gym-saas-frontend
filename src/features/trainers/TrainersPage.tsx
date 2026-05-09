import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Dumbbell, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { useTrainers, useArchiveTrainer } from './hooks/use-trainers';
import TrainerForm from './components/TrainerForm';
import type { TrainerProfile, TrainerStatus } from '@/types/trainer.types';

// ─── Star rating display ──────────────────────────────────────────────────────

function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium">{avg > 0 ? avg.toFixed(1) : '—'}</span>
      {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<TrainerStatus, 'success' | 'secondary' | 'warning'> = {
  active:   'success',
  inactive: 'secondary',
  on_leave: 'warning',
};
const STATUS_LABEL: Record<TrainerStatus, string> = {
  active:   'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

// ─── TrainersPage ─────────────────────────────────────────────────────────────

export default function TrainersPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<TrainerStatus | 'all'>('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<TrainerProfile | undefined>();

  const { confirm, confirmProps } = useConfirm();
  const archive = useArchiveTrainer();

  const query = {
    ...table.queryParams,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(availableOnly ? { availableOnly: true } : {}),
  };

  const { data, isLoading } = useTrainers(query);

  function handleEdit(trainer: TrainerProfile) {
    setEditingTrainer(trainer);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditingTrainer(undefined);
    setFormOpen(true);
  }

  const columns: ColumnDef<TrainerProfile>[] = [
    {
      key: 'userId',
      header: 'Trainer',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.userId.firstName} {row.userId.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.userId.email}</p>
        </div>
      ),
    },
    {
      key: 'specializations',
      header: 'Specializations',
      hideOnMobile: true,
      cell: (row) => row.specializations.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.specializations.slice(0, 3).map((s) => (
            <Badge key={s} variant="outline" className="text-xs capitalize">{s}</Badge>
          ))}
          {row.specializations.length > 3 && (
            <Badge variant="outline" className="text-xs">+{row.specializations.length - 3}</Badge>
          )}
        </div>
      ) : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'ratingAvg',
      header: 'Rating',
      sortable: true,
      cell: (row) => <StarRating avg={row.ratingAvg} count={row.ratingCount} />,
    },
    {
      key: 'currentClientCount',
      header: 'Clients',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => (
        <span className="tabular-nums text-sm">
          {row.currentClientCount}
          <span className="text-muted-foreground"> / {row.maxClients}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
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
          {can('trainer.update') && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
              Edit
            </Button>
          )}
          {can('trainer.update') && (
            <Button
              variant="ghost" size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  { title: `Archive ${row.userId.firstName} ${row.userId.lastName}?`, description: 'This will end all active assignments and archive the trainer profile.', variant: 'destructive', confirmLabel: 'Archive' },
                  () => archive.mutate(row._id),
                );
              }}
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Trainers"
        subtitle="Manage trainer profiles and member assignments"
        actions={
          can('trainer.create') && (
            <Button onClick={handleAdd}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Trainer
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search by name or specialization…"
          className="flex-1 max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as TrainerStatus | 'all'); table.setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="availableOnly"
            checked={availableOnly}
            onCheckedChange={(v) => { setAvailableOnly(v); table.setPage(1); }}
          />
          <Label htmlFor="availableOnly" className="text-sm cursor-pointer">Available only</Label>
        </div>
      </div>

      {/* Table */}
      {!isLoading && data?.trainers.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-12 w-12" />}
          title="No trainers found"
          description={table.search ? 'Try adjusting your search or filters.' : 'Add your first trainer to get started.'}
          action={can('trainer.create') ? { label: 'Add Trainer', onClick: handleAdd } : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.trainers ?? []}
            keyExtractor={(r) => r._id}
            loading={isLoading}
            skeletonRows={10}
            sort={table.sort}
            onSortChange={table.setSort}
            onRowClick={(row) => navigate(`/trainers/${row._id}`)}
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

      <TrainerForm open={formOpen} onOpenChange={setFormOpen} trainer={editingTrainer} />
      <ConfirmDialog {...confirmProps} loading={archive.isPending} />
    </PageShell>
  );
}
