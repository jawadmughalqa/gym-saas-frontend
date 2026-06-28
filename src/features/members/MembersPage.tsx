import { useState }        from 'react';
import { useNavigate }     from 'react-router-dom';
import { UserPlus, Upload } from 'lucide-react';
import { useQueryClient }  from '@tanstack/react-query';
import { Button }          from '@/components/ui/button';
import PageHeader          from '@/components/layout/PageHeader';
import PageShell           from '@/components/layout/PageShell';
import ConfirmDialog       from '@/components/shared/ConfirmDialog';
import { useTableState }   from '@/hooks/use-table-state';
import { useConfirm }      from '@/hooks/use-confirm';
import { usePermission }   from '@/hooks/use-permission';
import { useToast }        from '@/hooks/use-toast';
import { useArchiveMember } from './hooks/use-members';
import { MembersFilters }  from './components/MembersFilters';
import { MembersTable }    from './components/MembersTable';
import MemberForm          from './components/MemberForm';
import { MemberStatusDialog } from './components/MemberStatusDialog';

import type { Member, MemberStatus } from '@/types/member.types';
import {
  useGetMembers,
  getGetMembersQueryKey,
  getGetMembersMemberIdQueryKey,
} from '@/api/generated/members/members';
import { api } from '@/lib/axios';

// ─── Status change (inline — no Orval hook for this endpoint yet) ─────────────

function useChangeMemberStatus() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const [isPending, setIsPending] = useState(false);

  async function mutate(
    memberId: string,
    payload: {
      status:         MemberStatus;
      reason?:        string;
      freezeEndDate?: string;
      notes?:         string;
    },
    onSuccess?: () => void,
  ) {
    setIsPending(true);
    try {
      await api.patch(`/members/${memberId}/status`, payload);
      // Invalidate both the list AND the individual detail page cache
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMembersMemberIdQueryKey(memberId) }),
      ]);
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

// ─── MembersPage ──────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { can }      = usePermission();
  const navigate     = useNavigate();
  const table        = useTableState({ defaultLimit: 20 });
  const { confirm, confirmProps } = useConfirm();
  const archive      = useArchiveMember();
  const changeStatus = useChangeMemberStatus();

  const [statusFilter,  setStatusFilter]  = useState<MemberStatus | 'all'>('all');
  const [formOpen,      setFormOpen]      = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();

  // ── Status dialog state ───────────────────────────────────────────────────
  const [statusDialog, setStatusDialog] = useState<{
    open:         boolean;
    member:       Member | null;
    targetStatus: MemberStatus;
  }>({ open: false, member: null, targetStatus: 'active' });

  // ── Query ─────────────────────────────────────────────────────────────────
  const query = {
    ...table.queryParams,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };
  const { data, isLoading } = useGetMembers(query);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openStatusDialog(member: Member, target: MemberStatus) {
    setStatusDialog({ open: true, member, targetStatus: target });
  }

  function closeStatusDialog() {
    setStatusDialog((prev) => ({ ...prev, open: false, member: null }));
  }

  function handleStatusConfirm(payload: {
    status:         MemberStatus;
    reason?:        string;
    freezeEndDate?: string;
    notes?:         string;
  }) {
    if (!statusDialog.member) return;
    changeStatus.mutate(statusDialog.member._id, payload, closeStatusDialog);
  }

  function handleAddMember() {
    setEditingMember(undefined);
    setFormOpen(true);
  }

  function handleEdit(member: Member) {
    setEditingMember(member);
    setFormOpen(true);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <PageHeader
        title="Members"
        subtitle="Manage gym members and their subscriptions"
        actions={
          can('member.create') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/members/import')}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={handleAddMember}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>
          )
        }
      />

      {/* Search + status filter */}
      <MembersFilters
        search={table.search}
        onSearchChange={table.setSearch}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          table.setPage(1);
        }}
      />

      {/* Members table */}
      <MembersTable
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={data?.pagination}
        sort={table.sort}
        onSortChange={table.setSort}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        onEdit={handleEdit}
        onStatusClick={openStatusDialog}
        hasSearch={!!table.search || statusFilter !== 'all'}
        onAddMember={handleAddMember}
      />

      {/* Add / edit member sheet */}
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