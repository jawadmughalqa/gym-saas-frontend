import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from "@/components/shared/DataTable";
import type { ColumnDef } from "@/components/shared/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import SearchInput from "@/components/shared/SearchInput";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useGetBranches } from "@/api/generated/branches/branches";
import { useStaffList, useUpdateStaffStatus } from "./hooks/use-staff";
import StaffForm, { ROLE_LABELS } from "./components/StaffForm";
import type { StaffUser } from "@/api/generated/schemas";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-permission";
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  ShieldCheck,
  UserX,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  inactive: "secondary",
  suspended: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

// ─── StaffPage ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | undefined>();

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    staff: StaffUser | null;
    action: "active" | "inactive" | "suspended";
    label: string;
  }>({ open: false, staff: null, action: "active", label: "" });

  const { can } = usePermission();
  const canManageStaff = can("role.assign");

  const debouncedSearch = useDebounce(search, 350);

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const queryParams = {
    page,
    limit: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(roleFilter !== "all"
      ? { role: roleFilter as "branch_manager" | "staff" | "trainer" }
      : {}),
    ...(statusFilter !== "all"
      ? { status: statusFilter as "active" | "inactive" | "suspended" }
      : {}),
    ...(branchFilter !== "all" ? { branchId: branchFilter } : {}),
  };

  const { data, isLoading } = useStaffList(queryParams);
  const staffList = data?.data ?? [];
  const pagination = data?.pagination;

  const statusMutation = useUpdateStaffStatus(statusDialog.staff?._id ?? "");

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(undefined);
    setFormOpen(true);
  };
  const openEdit = (s: StaffUser) => {
    setEditTarget(s);
    setFormOpen(true);
  };

  const confirmStatusChange = (
    staff: StaffUser,
    action: "active" | "inactive" | "suspended",
  ) => {
    const labels: Record<string, string> = {
      active: "Reactivate",
      inactive: "Deactivate",
      suspended: "Suspend",
    };
    setStatusDialog({ open: true, staff, action, label: labels[action] });
  };

  const handleStatusConfirm = () => {
    if (!statusDialog.staff) return;
    statusMutation.mutate(
      {
        staffId: statusDialog.staff._id!,
        data: { status: statusDialog.action },
      },
      { onSuccess: () => setStatusDialog((d) => ({ ...d, open: false })) },
    );
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnDef<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      cell: (s) => (
        <div>
          <p className="font-medium">
            {s.firstName} {s.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{s.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (s) => (
        <Badge variant="outline">
          {ROLE_LABELS[s.role ?? ""] ?? s.role ?? "—"}
        </Badge>
      ),
    },
    {
      key: "branches",
      header: "Branches",
      cell: (s) => {
        const ids = s.branchIds ?? [];
        if (ids.length === 0)
          return <span className="text-muted-foreground text-sm">—</span>;
        const names = ids
          .map((id) => branches.find((b) => b._id === id)?.name ?? id)
          .join(", ");
        return (
          <span className="text-sm line-clamp-1" title={names}>
            {names}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => {
        const status = s.status ?? "active";
        return (
          <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
    },
    {
      key: "lastLoginAt",
      header: "Last login",
      cell: (s) => {
        if (!s.lastLoginAt)
          return <span className="text-muted-foreground text-sm">Never</span>;
        return (
          <span className="text-sm">
            {new Date(s.lastLoginAt).toLocaleDateString()}
          </span>
        );
      },
    },
    ...(canManageStaff
      ? ([
          {
            key: "actions",
            header: "",
            cell: (s: StaffUser) => {
              const isActive = s.status === "active";
              const isSuspended = s.status === "suspended";
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(s)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isActive && (
                      <>
                        <DropdownMenuItem
                          onClick={() => confirmStatusChange(s, "inactive")}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => confirmStatusChange(s, "suspended")}
                          className="text-destructive focus:text-destructive"
                        >
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isActive && (
                      <DropdownMenuItem
                        onClick={() => confirmStatusChange(s, "active")}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                    {!isSuspended && s.status !== "active" && (
                      <DropdownMenuItem
                        onClick={() => confirmStatusChange(s, "suspended")}
                        className="text-destructive focus:text-destructive"
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          },
        ] as ColumnDef<StaffUser>[])
      : []),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <PageHeader
        title="Staff"
        subtitle="Manage branch managers, staff, and trainers"
      />
      <Button onClick={openCreate} size="sm">
        <UserPlus className="mr-2 h-4 w-4" />
        Add staff
      </Button>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name or email…"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Role
          </Label>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Branch
          </Label>
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={staffList}
        keyExtractor={(s) => s._id ?? ""}
        loading={isLoading}
        emptyMessage="No staff members found. Add one to get started."
      />

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* Create / Edit sheet */}
      <StaffForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        staff={editTarget}
      />

      {/* Status change confirm dialog */}
      <ConfirmDialog
        open={statusDialog.open}
        onClose={() => setStatusDialog((d) => ({ ...d, open: false }))}
        onConfirm={handleStatusConfirm}
        title={`${statusDialog.label} ${statusDialog.staff?.firstName ?? "staff member"}?`}
        description={
          statusDialog.action === "suspended"
            ? "This will block the user from logging in immediately."
            : statusDialog.action === "inactive"
              ? "The account will be deactivated but data will be preserved."
              : "The account will be restored and the user can log in again."
        }
        confirmLabel={statusDialog.label}
        variant={
          statusDialog.action === "suspended" ? "destructive" : "default"
        }
        isLoading={statusMutation.isPending}
      />
    </PageShell>
  );
}
