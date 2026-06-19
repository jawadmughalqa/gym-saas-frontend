import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePostTrainersTrainerIdAssignments,
  useGetTrainersTrainerId,
  getGetTrainersTrainerIdAssignmentsQueryKey,
} from "@/api/generated/trainers/trainers";
import { toast } from "@/hooks/use-toast";
import { useGetMembers } from "@/api/generated/members/members";
import { useGetBranches } from "@/api/generated/branches/branches";
import { useQueryClient } from "@tanstack/react-query";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const assignSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  branchId: z.string().min(1, "Please select a branch"),
  goal: z.string().max(300).optional(),
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
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);

  // Fetch this trainer's profile to get their availability slots
  const { data: trainerData } = useGetTrainersTrainerId(trainerId, {
    query: { enabled: open },
  });
  const trainerAvailability: AvailabilitySlot[] =
    (trainerData?.data as any)?.availability ?? [];

  const assign = usePostTrainersTrainerIdAssignments({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getGetTrainersTrainerIdAssignmentsQueryKey(trainerId),
        });
        toast({ title: "Member assigned successfully" });
        reset();
        setSelectedSlots([]);
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to assign member",
          description: err?.response?.data?.message || "Something went wrong.",
        });
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

  // ── Slot toggle ────────────────────────────────────────────────────────────
  function toggleSlot(slot: AvailabilitySlot) {
    setSelectedSlots((prev) => {
      const exists = prev.some(
        (s) => s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime,
      );
      return exists
        ? prev.filter(
            (s) => !(s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime),
          )
        : [...prev, slot];
    });
  }

  function isSlotSelected(slot: AvailabilitySlot) {
    return selectedSlots.some(
      (s) => s.day === slot.day && s.startTime === slot.startTime && s.endTime === slot.endTime,
    );
  }

  function onSubmit(values: AssignFormValues) {
    assign.mutate({
      trainerId,
      data: {
        memberId: values.memberId,
        branchId: values.branchId,
        goal: values.goal || undefined,
        scheduledSlots: selectedSlots.length > 0 ? selectedSlots : undefined,
        notes: values.notes || undefined,
        startDate: values.startDate || undefined,
      },
    });
  }

  function handleClose(v: boolean) {
    if (!v) { reset(); setSelectedSlots([]); }
    onOpenChange(v);
  }

  // Group availability by day for display
  const slotsByDay = trainerAvailability.reduce<Record<number, AvailabilitySlot[]>>(
    (acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Scheduled slots */}
          <div className="space-y-1.5">
            <Label>
              Scheduled Slots{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            {trainerAvailability.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                This trainer has no availability slots set.
              </p>
            ) : (
              <div className="space-y-2 rounded-md border p-3">
                {Object.entries(slotsByDay)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, slots]) => (
                    <div key={day} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {DAY_NAMES[Number(day)]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {slots.map((slot, i) => {
                          const selected = isSlotSelected(slot);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleSlot(slot)}
                              disabled={assign.isPending}
                              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary/50 text-foreground"
                              }`}
                            >
                              {selected && <Check className="h-3 w-3" />}
                              {slot.startTime} – {slot.endTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {selectedSlots.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedSlots
                  .sort((a, b) => a.day - b.day)
                  .map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {DAY_NAMES[s.day]} {s.startTime}–{s.endTime}
                    </Badge>
                  ))}
              </div>
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

          {/* Start Date */}
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" disabled={assign.isPending} {...register("startDate")} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional…" disabled={assign.isPending} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={assign.isPending}>
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
