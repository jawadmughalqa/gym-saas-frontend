import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { UserPlus, Plus, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useTableState } from '@/hooks/use-table-state';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/stores/auth.store';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useWalkInLeads, useWalkInLeadStats, useDeleteWalkInLead } from './hooks/use-walkin-leads';
import WalkInLeadForm, { SOURCE_LABELS, STATUS_LABELS } from './components/WalkInLeadForm';
import ConvertLeadDialog from './components/ConvertLeadDialog';
import LeadNotesDialog from './components/LeadNotesDialog';
import type { WalkInLead, WalkInLeadStatus, WalkInLeadSource } from '@/api/walkInLeads.api';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<WalkInLeadStatus, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  new: 'secondary',
  contacted: 'outline',
  follow_up: 'warning',
  trial_scheduled: 'default',
  converted: 'success',
  lost: 'destructive',
};

function personName(ref: { firstName: string; lastName: string } | string | undefined): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') return undefined;
  return `${ref.firstName} ${ref.lastName}`.trim();
}

function branchLabel(branchId: WalkInLead['branchId']): string {
  if (typeof branchId === 'string') return branchId;
  return branchId.name;
}

// ─── WalkInLeadsPage ──────────────────────────────────────────────────────────

export default function WalkInLeadsPage() {
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });
  const isBranchManager = useAuthStore((s) => s.user?.role === 'branch_manager');

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<WalkInLead | undefined>();

  const [notesLead, setNotesLead] = useState<WalkInLead | undefined>();
  const [notesOpen, setNotesOpen] = useState(false);

  const [convertLead, setConvertLead] = useState<WalkInLead | undefined>();
  const [convertOpen, setConvertOpen] = useState(false);

  const { confirm, confirmProps } = useConfirm();
  const deleteLead = useDeleteWalkInLead();

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
    ...(statusFilter !== 'all' ? { status: statusFilter as WalkInLeadStatus } : {}),
    ...(sourceFilter !== 'all' ? { source: sourceFilter as WalkInLeadSource } : {}),
  };

  const { data, isLoading } = useWalkInLeads(query);
  const { data: stats } = useWalkInLeadStats(branchFilter !== 'all' ? branchFilter : undefined);

  function handleAdd() {
    setEditingLead(undefined);
    setFormOpen(true);
  }

  function handleEdit(lead: WalkInLead) {
    setEditingLead(lead);
    setFormOpen(true);
  }

  function handleNotes(lead: WalkInLead) {
    setNotesLead(lead);
    setNotesOpen(true);
  }

  function handleConvert(lead: WalkInLead) {
    setConvertLead(lead);
    setConvertOpen(true);
  }

  function handleDelete(lead: WalkInLead) {
    confirm(
      {
        title: 'Delete Lead?',
        description: `This will permanently delete "${lead.fullName}". This action cannot be undone.`,
        variant: 'destructive',
        confirmLabel: 'Delete',
      },
      () => deleteLead.mutate(lead._id),
    );
  }

  const columns: ColumnDef<WalkInLead>[] = [
    {
      key: 'fullName',
      header: 'Lead',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {row.phone}
            {row.email ? ` · ${row.email}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{branchLabel(row.branchId)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm">{SOURCE_LABELS[row.source] ?? row.source}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status] ?? row.status}</Badge>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {personName(row.assignedTo) ?? '—'}
        </span>
      ),
    },
    {
      key: 'followUpDate',
      header: 'Follow-up',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.followUpDate ? format(new Date(row.followUpDate), 'dd MMM yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'visitDate',
      header: 'Visit Date',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.visitDate), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-48',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleNotes(row); }}
          >
            Notes
          </Button>
          {can('walkin_lead.update') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            >
              Edit
            </Button>
          )}
          {can('walkin_lead.convert') && row.status !== 'converted' && row.status !== 'lost' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleConvert(row); }}
            >
              Convert
            </Button>
          )}
          {can('walkin_lead.delete') && (
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
        title="Walk-in Leads"
        subtitle="Track walk-in visitors and prospects from first contact to conversion"
        actions={
          can('walkin_lead.create') && (
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          )
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="rounded-full bg-green-100 p-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats.convertedCount}</p>
              <p className="text-xs text-muted-foreground">Converted to Members</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{stats.conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search leads…"
          className="flex-1 min-w-[200px] max-w-sm"
        />

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

        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceFilter}
          onValueChange={(v) => { setSourceFilter(v); table.setPage(1); }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && data?.data?.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-12 w-12" />}
          title="No walk-in leads found"
          description={
            table.search || branchFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Log your first walk-in visitor to start tracking prospects.'
          }
          action={can('walkin_lead.create') ? { label: 'Add Lead', onClick: handleAdd } : undefined}
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
              meta={{
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.total,
                pages: data.pagination.pages ?? data.pagination.totalPages ?? 0,
              }}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
            />
          )}
        </>
      )}

      <WalkInLeadForm open={formOpen} onOpenChange={setFormOpen} lead={editingLead} />
      <LeadNotesDialog open={notesOpen} onOpenChange={setNotesOpen} lead={notesLead} />
      <ConvertLeadDialog open={convertOpen} onOpenChange={setConvertOpen} lead={convertLead} />
      <ConfirmDialog {...confirmProps} loading={deleteLead.isPending} />
    </PageShell>
  );
}
