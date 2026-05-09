import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, MoreHorizontal, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useGetBranches,
  usePatchBranchesBranchIdStatus,
  getGetBranchesQueryKey,
} from '@/api/generated/branches/branches';
import { useQueryClient } from '@tanstack/react-query';
import type { Branch } from '@/api/generated/schemas/branch';
import type { GetBranchesStatus } from '@/api/generated/schemas/getBranchesStatus';
import BranchForm from './components/BranchForm';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  if (status === 'active') return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>;
  if (status === 'inactive') return <Badge variant="secondary">Inactive</Badge>;
  if (status === 'archived') return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
  return <Badge variant="outline">{status ?? '—'}</Badge>;
}

// ─── BranchesPage ─────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GetBranchesStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);
  const { confirm, confirmProps } = useConfirm();

  const { data, isLoading } = useGetBranches(
    {
      page,
      limit,
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    },
    { query: { staleTime: 1000 * 30 } },
  );

  const changeStatus = usePatchBranchesBranchIdStatus({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetBranchesQueryKey() }),
    },
  });

  const branches: Branch[] = data?.data ?? [];
  const pagination = data?.pagination;

  function handleEdit(branch: Branch) {
    setEditBranch(branch);
    setFormOpen(true);
  }

  function handleDeactivate(branch: Branch) {
    const isActive = branch.status === 'active';
    confirm(
      {
        title: isActive ? 'Deactivate branch?' : 'Activate branch?',
        description: isActive
          ? `"${branch.name}" will be set to inactive and staff will lose access.`
          : `"${branch.name}" will be reactivated.`,
        variant: isActive ? 'destructive' : 'default',
        confirmLabel: isActive ? 'Deactivate' : 'Activate',
      },
      () =>
        changeStatus.mutate({
          branchId: branch._id!,
          data: { status: isActive ? 'inactive' : 'active' },
        }),
    );
  }

  const columns = [
    {
      key: 'name',
      label: 'Branch',
      render: (_: unknown, row: Branch) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.name}
            {row.isHeadquarters && (
              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">HQ</Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{row.code}</span>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Location',
      render: (_: unknown, row: Branch) => {
        const a = row.address;
        if (!a) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {[a.city, a.state, a.country].filter(Boolean).join(', ')}
          </span>
        );
      },
    },
    {
      key: 'memberCount',
      label: 'Members',
      render: (v: unknown) => <span className="tabular-nums">{(v as number) ?? 0}</span>,
    },
    {
      key: 'trainerCount',
      label: 'Trainers',
      render: (v: unknown) => <span className="tabular-nums">{(v as number) ?? 0}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: unknown) => <StatusBadge status={v as string} />,
    },
    {
      key: '_id',
      label: '',
      render: (_: unknown, row: Branch) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
              Edit
            </DropdownMenuItem>
            {row.status !== 'archived' && (
              <DropdownMenuItem
                className={row.status === 'active' ? 'text-destructive' : ''}
                onClick={(e) => { e.stopPropagation(); handleDeactivate(row); }}
              >
                <PowerOff className="mr-2 h-3.5 w-3.5" />
                {row.status === 'active' ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Branches"
        subtitle="Manage gym locations"
        actions={
          <Button size="sm" onClick={() => { setEditBranch(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Branch
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search branches…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as GetBranchesStatus | 'all'); setPage(1); }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && branches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No branches found"
          description={
            debouncedSearch || statusFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Create your first branch to get started.'
          }
          action={
            !debouncedSearch && statusFilter === 'all'
              ? { label: 'New Branch', onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={branches}
          loading={isLoading}
          onRowClick={(row) => navigate(`/branches/${row._id}`)}
          rowClassName="cursor-pointer"
        />
      )}

      {pagination && branches.length > 0 && (
        <Pagination meta={pagination} onPageChange={setPage} />
      )}

      <BranchForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditBranch(null); }}
        branch={editBranch}
      />

      <ConfirmDialog {...confirmProps} loading={changeStatus.isPending} />
    </PageShell>
  );
}
