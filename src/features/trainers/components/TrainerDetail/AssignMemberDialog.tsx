import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePostTrainersTrainerIdAssignments,
  getGetTrainersTrainerIdAssignmentsQueryKey,
} from "@/api/generated/trainers/trainers";
import { useGetMembers } from "@/api/generated/members/members";
import { useGetBranches } from "@/api/generated/branches/branches";
import { useQueryClient } from "@tanstack/react-query";

// ─── Schema ───────────────────────────────────────────────────────────────────

const assignSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  branchId: z.string().min(1, "Please select a branch"),
  goal: z.string().max(300).optional(),
  sessionFrequencyPerWeek: z.coerce.number().int().min(1).max(14).optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
});
type AssignFormValues = z.infer<typeof assignSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  trainerId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function AssignMemberDialog({ trainerId, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const assign = usePostTrainersTrainerIdAssignments({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getGetTrainersTrainerIdAssignmentsQueryKey(trainerId),
        });
        reset();
        onOpenChange(false);
      },
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { memberId: "", branchId: "", goal: "", notes: "", startDate: "" },
  });

  const selectedBranchId = watch("branchId");

  const { data: branchesData } = useGetBranches(
    { limit: 100, status: "active" },
    { query: { enabled: open } },
  );
  const branches = branchesData?.data ?? [];

  const { data: membersData } = useGetMembers(
    { limit: 100, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) },
    { query: { enabled: open && !!selectedBranchId } },
  );
  const members = membersData?.data ?? [];

  function onSubmit(values: AssignFormValues) {
    assign.mutate({
      trainerId,
      data: {
        memberId: values.memberId,
        branchId: values.branchId,
        goal: values.goal || undefined,
        sessionFrequencyPerWeek: values.sessionFrequencyPerWeek,
        notes: values.notes || undefined,
        startDate: values.startDate || undefined,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Branch */}
          <div className="space-y-1.5">
            <Label>Branch <span className="text-destructive">*</span></Label>
            <Select
              value={watch("branchId")}
              onValueChange={(v) => {
                setValue("branchId", v, { shouldValidate: true });
                setValue("memberId", "");
              }}
              disabled={assign.isPending}
            >
              <SelectTrigger className={errors.branchId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a branch…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id!}>
                    {b.name}
                    {b.isHeadquarters && (
                      <span className="ml-1 text-xs text-muted-foreground">(HQ)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && (
              <p className="text-xs text-destructive">{errors.branchId.message}</p>
            )}
          </div>

          {/* Member */}
          <div className="space-y-1.5">
            <Label>Member <span className="text-destructive">*</span></Label>
            <Select
              value={watch("memberId")}
              onValueChange={(v) => setValue("memberId", v, { shouldValidate: true })}
              disabled={assign.isPending || !selectedBranchId}
            >
              <SelectTrigger className={errors.memberId ? "border-destructive" : ""}>
                <SelectValue
                  placeholder={selectedBranchId ? "Select a member…" : "Select a branch first"}
                />
              </SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No members in this branch
                  </div>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m._id} value={m._id!}>
                      {m.firstName} {m.lastName}
                      <span className="ml-1 text-xs text-muted-foreground">· {m.email}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-xs text-destructive">{errors.memberId.message}</p>
            )}
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <Label>Goal</Label>
            <Input
              placeholder="e.g. Weight loss"
              disabled={assign.isPending}
              {...register("goal")}
            />
          </div>

          {/* Sessions / Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sessions / week</Label>
              <Input
                type="number"
                min={1}
                max={14}
                placeholder="e.g. 3"
                disabled={assign.isPending}
                {...register("sessionFrequencyPerWeek")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" disabled={assign.isPending} {...register("startDate")} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional…" disabled={assign.isPending} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
