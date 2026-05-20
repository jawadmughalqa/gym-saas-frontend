import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { usePermission } from "@/hooks/use-permission";
import { useConfirm } from "@/hooks/use-confirm";
import { formatDate } from "@/utils/format";
import {
  useGetTrainersTrainerIdAssignments,
  usePostTrainersTrainerIdAssignmentsAssignmentIdEnd,
  getGetTrainersTrainerIdAssignmentsQueryKey,
} from "@/api/generated/trainers/trainers";
import { useQueryClient } from "@tanstack/react-query";
import type { TrainerAssignment, AssignmentStatus } from "@/types/trainer.types";
import AssignMemberDialog from "./AssignMemberDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSIGNMENT_VARIANT: Record<AssignmentStatus, "success" | "warning" | "secondary"> = {
  active: "success",
  paused: "warning",
  ended: "secondary",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignmentsTab({ trainerId }: { trainerId: string }) {
  const { can } = usePermission();
  const qc = useQueryClient();
  const { data: assignmentsData, isLoading } = useGetTrainersTrainerIdAssignments(trainerId);
  const assignments = (assignmentsData?.data ?? []) as TrainerAssignment[];

  const [assignOpen, setAssignOpen] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const end = usePostTrainersTrainerIdAssignmentsAssignmentIdEnd({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getGetTrainersTrainerIdAssignmentsQueryKey(trainerId),
        });
      },
    },
  });

  const columns: ColumnDef<TrainerAssignment>[] = [
    {
      key: "memberId",
      header: "Member",
      cell: (row) => (
        <div>
          <p className="font-medium">
            {row.memberId.firstName} {row.memberId.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.memberId.email}</p>
        </div>
      ),
    },
    {
      key: "goal",
      header: "Goal",
      hideOnMobile: true,
      cell: (row) => row.goal ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "sessionFrequencyPerWeek",
      header: "Freq / week",
      hideOnMobile: true,
      cell: (row) =>
        row.sessionFrequencyPerWeek ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "startDate",
      header: "Started",
      hideOnMobile: true,
      cell: (row) => formatDate(row.startDate),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={ASSIGNMENT_VARIANT[row.status]}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      cell: (row) =>
        row.status === "active" && can("trainer.assign") ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  {
                    title: `End assignment with ${row.memberId.firstName}?`,
                    description: "This will end the assignment and free up a client slot.",
                    variant: "destructive",
                    confirmLabel: "End Assignment",
                  },
                  () => end.mutate({ trainerId, assignmentId: row._id, data: { reason: "Ended by staff" } }),
                );
              }}
            >
              End
            </Button>
          </div>
        ) : null,
    },
  ];

  const activeCount = assignments.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeCount} active assignment{activeCount !== 1 ? "s" : ""}
        </p>
        {can("trainer.assign") && (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Member
          </Button>
        )}
      </div>

      {!isLoading && assignments.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No assignments"
          description="Assign a member to this trainer to get started."
          action={
            can("trainer.assign")
              ? { label: "Assign Member", onClick: () => setAssignOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={assignments}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <AssignMemberDialog trainerId={trainerId} open={assignOpen} onOpenChange={setAssignOpen} />
      <ConfirmDialog
        open={confirmProps.open}
        onOpenChange={confirmProps.onOpenChange}
        onConfirm={confirmProps.onConfirm}
        title={confirmProps.title}
        description={confirmProps.description}
        confirmLabel={confirmProps.confirmLabel}
        variant={confirmProps.variant}
        loading={end.isPending}
      />
    </div>
  );
}
