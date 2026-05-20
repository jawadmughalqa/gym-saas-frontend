import { useState } from "react";
import {
  ShieldCheck,
  Plus,
  MoreHorizontal,
  UserCog,
  Trash2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRoles,
  useDeleteRolesRoleId,
  usePostRolesAssign,
  getGetRolesQueryKey,
} from "@/api/generated/roles/roles";
import { useGetBranches } from "@/api/generated/branches/branches";
import type { Role } from "@/api/generated/schemas/role";
import RoleForm from "./components/RoleForm";
import { UserCombobox } from "@/components/ui/UserCombobox";

// ─── Assign Role Dialog ───────────────────────────────────────────────────────

const assignSchema = z.object({
  // userId is now set by UserCombobox — still validated as non-empty
  userId: z.string().min(1, "Please select a user"),
  roleId: z.string().min(1, "Role is required"),
  branchId: z.string().optional(),
});
type AssignFormValues = z.infer<typeof assignSchema>;

function AssignRoleDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: Role[];
}) {
  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { userId: "", roleId: "", branchId: undefined },
  });

  const { data: branchesData } = useGetBranches(
    { limit: 100, status: "active" },
    { query: { staleTime: 1000 * 60, enabled: open } },
  );
  const branches = branchesData?.data ?? [];

  const assign = usePostRolesAssign({
    mutation: {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
      onError: (err) =>
        toast({
          variant: "destructive",
          title: "Failed to assign role",
          description: getErrorMessage(err),
        }),
    },
  });

  function onSubmit(values: AssignFormValues) {
    assign.mutate({
      data: {
        userId: values.userId,
        roleId: values.roleId,
        ...(values.branchId &&
          values.branchId !== "__none__" && {
            branchId: values.branchId,
          }),
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role to User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ── User picker (replaces plain text input) ── */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User *</FormLabel>
                  <FormControl>
                    {/*
                     * UserCombobox calls field.onChange with the selected _id.
                     * The form value stays a plain string — no behaviour change.
                     */}
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      disabled={assign.isPending}
                      placeholder="Select a user…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Role selector (unchanged) ── */}
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r._id} value={r._id!}>
                          {r.name}
                          {r.isBuiltIn && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (built-in)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Branch selector (unchanged) ── */}
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch (optional)</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? undefined : val)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All branches / global" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">All branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b._id!}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assign.isPending}>
                {assign.isPending ? "Assigning…" : "Assign Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── RolesPage (unchanged) ────────────────────────────────────────────────────

export default function RolesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const limit = 20;

  const { confirm, confirmProps } = useConfirm();

  const { data, isLoading } = useGetRoles(
    { page, limit },
    { query: { staleTime: 1000 * 30 } },
  );

  const deleteRole = useDeleteRolesRoleId({
    mutation: {
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: getGetRolesQueryKey() }),
      onError: (err) =>
        toast({
          variant: "destructive",
          title: "Failed to delete role",
          description: getErrorMessage(err),
        }),
    },
  });

  const roles: Role[] = data?.data ?? [];
  const pagination = data?.pagination;

  function handleEdit(role: Role) {
    setEditRole(role);
    setFormOpen(true);
  }

  function handleDelete(role: Role) {
    confirm(
      {
        title: "Delete role?",
        description: `"${role.name}" will be permanently deleted. Users with this role will lose it.`,
        variant: "destructive",
        confirmLabel: "Delete",
      },
      () => deleteRole.mutate({ roleId: role._id! }),
    );
  }

  const columns: ColumnDef<Role>[] = [
    {
      key: "name",
      header: "Role",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.isBuiltIn && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Lock className="h-3 w-3" /> Built-in
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      cell: (row) => {
        const perms = row.permissions;
        if (!perms?.length)
          return <span className="text-muted-foreground">None</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">
              {perms.length} permission{perms.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) =>
        row.createdAt ? (
          <span className="text-sm text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "_id",
      header: "",
      cell: (row) => {
        if (row.isBuiltIn) {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-30"
              disabled
              title="Built-in roles cannot be edited"
            >
              <Lock className="h-3.5 w-3.5" />
            </Button>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(row)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage custom roles and assign them to users"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              <UserCog className="mr-1.5 h-3.5 w-3.5" />
              Assign Role
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditRole(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Role
            </Button>
          </div>
        }
      />

      {!isLoading && roles.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-12 w-12" />}
          title="No custom roles"
          description="Create custom roles to control what staff can access."
          action={{ label: "New Role", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={roles}
          keyExtractor={(row) => row._id ?? ""}
          loading={isLoading}
        />
      )}

      {pagination && roles.length > 0 && (
        <Pagination meta={pagination} onPageChange={setPage} />
      )}

      <RoleForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditRole(null);
        }}
        role={editRole}
      />

      <AssignRoleDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        roles={roles}
      />

      <ConfirmDialog {...confirmProps} loading={deleteRole.isPending} />
    </PageShell>
  );
}