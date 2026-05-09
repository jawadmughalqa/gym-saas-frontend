import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import SearchInput from "@/components/shared/SearchInput";
import Pagination from "@/components/shared/Pagination";
import { MembershipStatusBadge } from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTableState } from "@/hooks/use-table-state";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { formatDate } from "@/utils/format";
import { useMembers, useArchiveMember } from "./hooks/use-members";
import MemberForm from "./components/MemberForm";
import type { Member, MemberStatus } from "@/types/member.types";
import { useGetMembers } from "@/api/generated/members/members";

// ─── Column definitions ───────────────────────────────────────────────────────

function useColumns(
  onEdit: (m: Member) => void,
  onArchive: (m: Member) => void,
  canEdit: boolean,
  canDelete: boolean,
): ColumnDef<Member>[] {
  return [
    {
      key: "fullName",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      cell: (row) => row.phone,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => <MembershipStatusBadge status={row.status} />,
    },
    {
      key: "joinedAt",
      header: "Joined",
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDate(row.joinedAt),
    },
    {
      key: "actions",
      header: "",
      width: "w-24",
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(row);
              }}
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];
}

// ─── MembersPage ──────────────────────────────────────────────────────────────

export default function MembersPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });

  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | undefined>();

  const { confirm, confirmProps } = useConfirm();
  const archive = useArchiveMember();

  const query = {
    ...table.queryParams,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useGetMembers(query);

  const columns = useColumns(
    (m) => {
      setEditingMember(m);
      setFormOpen(true);
    },
    (m) =>
      confirm(
        {
          title: `Archive ${m.fullName}?`,
          description:
            "This will cancel all active subscriptions. This action cannot be undone.",
          variant: "destructive",
          confirmLabel: "Archive",
        },
        () => archive.mutate(m._id),
      ),
    can("member.update"),
    can("member.delete"),
  );

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
          can("member.create") && (
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
            setStatusFilter(v as MemberStatus | "all");
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
              ? "Try adjusting your search or filters."
              : "Get started by adding your first member."
          }
          action={
            can("member.create")
              ? { label: "Add Member", onClick: handleAddMember }
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

      {/* Archive confirm */}
      <ConfirmDialog {...confirmProps} loading={archive.isPending} />
    </PageShell>
  );
}
