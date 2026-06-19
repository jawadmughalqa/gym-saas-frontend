import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Dumbbell, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import SearchInput from "@/components/shared/SearchInput";
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTableState } from "@/hooks/use-table-state";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import TrainerForm from "./components/TrainerForm";
import type { TrainerProfile, TrainerStatus } from "@/types/trainer.types";
import {
  useGetTrainers,
  useDeleteTrainersTrainerId,
  getGetTrainersQueryKey,
} from "@/api/generated/trainers/trainers";
import { orvalMutator } from "@/lib/orval-mutator";
import { useGetBranches } from "@/api/generated/branches/branches";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// ─── Star rating display ──────────────────────────────────────────────────────

function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium">
        {avg > 0 ? avg.toFixed(1) : "—"}
      </span>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  TrainerStatus | "archived",
  "success" | "secondary" | "warning" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  on_leave: "warning",
  archived: "destructive",
};
const STATUS_LABEL: Record<TrainerStatus | "archived", string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
  archived: "Archived",
};

// ─── Helper to get branch names from IDs ──────────────────────────────────────

function getBranchNames(
  branchIds: string[] | undefined,
  branches: Array<{ _id: string; name: string; isHeadquarters?: boolean }>
): Array<{ id: string; name: string; isHeadquarters: boolean }> {
  if (!branchIds || branchIds.length === 0) return [];
  
  return branchIds
    .map((id) => {
      const branch = branches.find((b) => b._id === id);
      return branch
        ? { id: branch._id, name: branch.name, isHeadquarters: branch.isHeadquarters || false }
        : null;
    })
    .filter((b): b is { id: string; name: string; isHeadquarters: boolean } => b !== null);
}

// ─── TrainersPage ─────────────────────────────────────────────────────────────

export default function TrainersPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const table = useTableState({ defaultLimit: 20 });
  const queryClient = useQueryClient();
  const { confirm, confirmProps } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<TrainerStatus | "all">(
    "all",
  );
  const [availableOnly, setAvailableOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<
    TrainerProfile | undefined
  >();

  const query = {
    ...table.queryParams,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(availableOnly ? { availableOnly: true } : {}),
  };
  
  const { data, isLoading } = useGetTrainers(query);
  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];
  
  const archive = useDeleteTrainersTrainerId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTrainersQueryKey() });
        toast({ title: "Trainer archived successfully" });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to archive trainer",
          description: err?.response?.data?.message || err?.message,
        });
      },
    },
  });

  const reactivate = useMutation({
    mutationFn: (trainerId: string) =>
      orvalMutator<unknown>({ url: `/trainers/${trainerId}/reactivate`, method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetTrainersQueryKey() });
      toast({ title: "Trainer reactivated successfully" });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reactivate trainer",
        description: err?.response?.data?.message || err?.message,
      });
    },
  });

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
      key: "userId",
      header: "Trainer",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">
            {row.userId.firstName} {row.userId.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.userId.email}</p>
        </div>
      ),
    },
    {
      key: "branchIds",
      header: "Branches",
      hideOnMobile: true,
      cell: (row) => {
        const trainerBranches = getBranchNames(row.branchIds, branches);
        
        if (trainerBranches.length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {trainerBranches.slice(0, 2).map((branch) => (
              <Badge key={branch.id} variant="outline" className="text-xs">
                {branch.name}
                {branch.isHeadquarters && (
                  <span className="ml-1 text-primary">(HQ)</span>
                )}
              </Badge>
            ))}
            {trainerBranches.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{trainerBranches.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "specializations",
      header: "Specializations",
      hideOnMobile: true,
      cell: (row) =>
        row.specializations.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.specializations.slice(0, 3).map((s) => (
              <Badge key={s} variant="outline" className="text-xs capitalize">
                {s}
              </Badge>
            ))}
            {row.specializations.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{row.specializations.length - 3}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    // {
    //   key: "ratingAvg",
    //   header: "Rating",
    //   sortable: true,
    //   cell: (row) => <StarRating avg={row.ratingAvg} count={row.ratingCount} />,
    // },
    {
      key: "currentClientCount",
      header: "Clients",
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
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => {
        const isArchived = !!(row as any).archivedAt;
        const key = isArchived ? "archived" : row.status;
        return (
          <Badge variant={STATUS_VARIANT[key]}>
            {STATUS_LABEL[key]}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "w-36",
      cell: (row) => {
        const isArchived = !!(row as any).archivedAt;
        return (
          <div className="flex items-center gap-1 justify-end">
            {!isArchived && can("trainer.update") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
              >
                Edit
              </Button>
            )}
            {isArchived && can("trainer.update") ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  confirm(
                    {
                      title: `Reactivate ${row.userId.firstName} ${row.userId.lastName}?`,
                      description:
                        "This will restore the trainer profile and set their status back to Active.",
                      confirmLabel: "Reactivate",
                    },
                    () => reactivate.mutate(row._id),
                  );
                }}
              >
                Reactivate
              </Button>
            ) : (
              can("trainer.update") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirm(
                      {
                        title: `Archive ${row.userId.firstName} ${row.userId.lastName}?`,
                        description:
                          "This will archive the trainer profile. The trainer must have no active member assignments before archiving.",
                        variant: "destructive",
                        confirmLabel: "Archive",
                      },
                      () => archive.mutate({ trainerId: row._id }),
                    );
                  }}
                >
                  Archive
                </Button>
              )
            )}
          </div>
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Trainers"
        subtitle="Manage trainer profiles and member assignments"
        actions={
          can("trainer.create") && (
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
          onValueChange={(v) => {
            setStatusFilter(v as TrainerStatus | "all");
            table.setPage(1);
          }}
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
            onCheckedChange={(v) => {
              setAvailableOnly(v);
              table.setPage(1);
            }}
          />
          <Label htmlFor="availableOnly" className="text-sm cursor-pointer">
            Available only
          </Label>
        </div>
      </div>

      {/* Table */}
      {!isLoading && data?.data?.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-12 w-12" />}
          title="No trainers found"
          description={
            table.search
              ? "Try adjusting your search or filters."
              : "Add your first trainer to get started."
          }
          action={
            can("trainer.create")
              ? { label: "Add Trainer", onClick: handleAdd }
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

      <TrainerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        trainer={editingTrainer}
      />
      <ConfirmDialog
        open={confirmProps.open}
        onOpenChange={confirmProps.onOpenChange}
        onConfirm={confirmProps.onConfirm}
        title={confirmProps.title}
        description={confirmProps.description}
        confirmLabel={confirmProps.confirmLabel}
        variant={confirmProps.variant}
        loading={archive.isPending || reactivate.isPending}
      />
    </PageShell>
  );
}