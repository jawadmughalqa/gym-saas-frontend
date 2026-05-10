import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import PageHeader  from "@/components/layout/PageHeader";
import PageShell   from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import SearchInput from "@/components/shared/SearchInput";
import Pagination  from "@/components/shared/Pagination";
import { MembershipStatusBadge } from "@/components/shared/StatusBadge";
import EmptyState    from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTableState } from "@/hooks/use-table-state";
import { useConfirm }    from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { useToast }      from "@/hooks/use-toast";
import { formatDate }    from "@/utils/format";
import { useArchiveMember } from "./hooks/use-members";
import MemberForm from "./components/MemberForm";
import { MemberStatusDialog } from "./components/MemberStatusDialog";
import type { Member, MemberStatus } from "@/types/member.types";
import {
  useGetMembers,
  getGetMembersQueryKey,
} from "@/api/generated/members/members";
import { api } from "@/lib/axios";

// ─── Status change hook (direct axios — no Orval hook exists yet) ─────────────

function useChangeMemberStatus() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const [isPending, setIsPending] = useState(false);

  async function mutate(
    memberId: string,
    payload: {
      status:        MemberStatus;
      reason?:       string;
      freezeEndDate?: string;
      notes?:        string;
    },
    onSuccess?: () => void,
  ) {
    setIsPending(true);
    try {
      await api.patch(`/members/${memberId}/status`, payload);
      await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
      toast({
        title:       'Status updated',
        description: `Member status changed to ${payload.status}.`,
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Failed to change member status.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  }

  return { mutate, isPending };
}

// ─── Available next statuses per current status ───────────────────────────────

function getAvailableStatuses(current: MemberStatus): MemberStatus[] {
  switch (current) {
    case 'active':    return ['suspended', 'frozen', 'inactive'];
    case 'suspended': return ['active', 'frozen', 'inactive'];
    case 'frozen':    return ['active', 'suspended', 'inactive'];
    case 'inactive':  return ['active'];
    default:          return [];
  }
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  active:    'Reactivate',
  suspended: 'Suspend',
  frozen:    'Freeze',
  inactive:  'Deactivate',
};

// ─── MembersPage ──────────────────────────────────────────────────────────────

export default function MembersPage() {
  const navigate     = useNavigate();
  const { can }      = usePermission();
  const table        = useTableState({ defaultLimit: 20 });
  const { confirm, confirmProps } = useConfirm();
  const archive      = useArchiveMember();
  const changeStatus = useChangeMemberStatus();

  const [statusFilter,  setStatusFilter]  = useState<MemberStatus | 'all'>('all');
  const [formOpen,      setFormOpen]      = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();

  // Status dialog state
  const [statusDialog, setStatusDialog] = useState<{
    open:          boolean;
    member:        Member | null;
    targetStatus:  MemberStatus;
  }>({ open: false, member: null, targetStatus: 'active' });

  const query = {
    ...table.queryParams,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useGetMembers(query);

  // ── Open status dialog ───────────────────────────────────────────────────
  function openStatusDialog(member: Member, target: MemberStatus) {
    setStatusDialog({ open: true, member, targetStatus: target });
  }

  function closeStatusDialog() {
    setStatusDialog((prev) => ({ ...prev, open: false, member: null }));
  }

  // ── Confirm status change ────────────────────────────────────────────────
  function handleStatusConfirm(payload: {
    status:        MemberStatus;
    reason?:       string;
    freezeEndDate?: string;
    notes?:        string;
  }) {
    if (!statusDialog.member) return;
    changeStatus.mutate(
      statusDialog.member._id,
      payload,
      closeStatusDialog,
    );
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnDef<Member>[] = [
    {
      key: 'fullName',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      cell: (row) => row.phone,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <MembershipStatusBadge status={row.status} />,
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.joinedAt),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-12',
      cell: (row) => {
        const availableStatuses = getAvailableStatuses(row.status);
        if (!can('member.update') || availableStatuses.length === 0) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Member actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">

              {/* Edit profile */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingMember(row);
                  setFormOpen(true);
                }}
              >
                Edit Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Status change options */}
              {availableStatuses.map((target) => (
                <DropdownMenuItem
                  key={target}
                  onClick={(e) => {
                    e.stopPropagation();
                    openStatusDialog(row, target);
                  }}
                  className={
                    target === 'inactive' || target === 'suspended'
                      ? 'text-destructive focus:text-destructive'
                      : target === 'active'
                      ? 'text-green-600 focus:text-green-600'
                      : ''
                  }
                >
                  {STATUS_LABELS[target]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  function handleAddMember() {
    setEditingMember(undefined);
    setFormOpen(true);
  }

  return (
    <PageShell>
      <PageHeader
        title="Members"
        subtitle="Manage gym members and their subscriptions"
        actions={
          can('member.create') && (
            <Button onClick={handleAddMember}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={table.search}
          onChange={table.setSearch}
          placeholder="Search by name, email or phone…"
          className="flex-1 max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as MemberStatus | 'all');
            table.setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && data?.data?.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No members found"
          description={
            table.search
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first member.'
          }
          action={
            can('member.create')
              ? { label: 'Add Member', onClick: handleAddMember }
              : undefined
          }
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
            onRowClick={(row) => navigate(`/members/${row._id}`)}
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

      {/* Add / Edit form */}
      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editingMember}
      />

      {/* Status change dialog */}
      {statusDialog.member && (
        <MemberStatusDialog
          open={statusDialog.open}
          onOpenChange={(o) => { if (!o) closeStatusDialog(); }}
          memberName={`${statusDialog.member.firstName} ${statusDialog.member.lastName}`}
          currentStatus={statusDialog.member.status}
          targetStatus={statusDialog.targetStatus}
          isSubmitting={changeStatus.isPending}
          onConfirm={handleStatusConfirm}
        />
      )}

      {/* Archive confirm (kept for backward compat) */}
      <ConfirmDialog {...confirmProps} loading={archive.isPending} />
    </PageShell>
  );
}