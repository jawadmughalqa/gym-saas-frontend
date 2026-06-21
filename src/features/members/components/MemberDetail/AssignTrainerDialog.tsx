import { useState, useEffect, useMemo } from "react";
import { User, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTrainers,
  usePostTrainersTrainerIdAssignments,
  getGetTrainersQueryKey,
  getGetTrainersTrainerIdAssignmentsQueryKey,
  getGetTrainersTrainerIdQueryKey,
} from "@/api/generated/trainers/trainers";
import { getGetInvoicesQueryKey } from "@/api/generated/invoices/invoices";
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from "@/api/generated/notifications/notifications";
import type { TrainerAssignment } from "./TrainerTab";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useTenantCurrency } from "@/hooks/use-tenant-currency";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  branchId: string;
  currentAssignment: TrainerAssignment | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignTrainerDialog({
  open,
  onOpenChange,
  memberId,
  branchId,
  currentAssignment,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const { currency } = useTenantCurrency();
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | undefined>();
  const [monthlyCharge, setMonthlyCharge] = useState<string>("");
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);

  // ── Fetch trainers ─────────────────────────────────────────────────────────
  const { data: trainersData, isLoading: loadingTrainers } = useGetTrainers(
    {
      status: "active",
      availableOnly: true,
      ...(branchId ? { branchId } : {}),
      limit: 100,
    },
    { query: { enabled: open, staleTime: 0 } },
  );
  // Filter out the currently-assigned trainer so they don't appear in the dropdown.
  // Memoized so the reference is stable — without this, every keystroke in the
  // charge field causes a re-render which recreates the array, which fires the
  // useEffect below and resets the user's custom value back to the default rate.
  const currentTrainerId =
    currentAssignment?.trainerId
      ? typeof currentAssignment.trainerId === "string"
        ? currentAssignment.trainerId
        : (currentAssignment.trainerId as any)._id
      : null;

  const trainers = useMemo(
    () => (trainersData?.data ?? []).filter((t) => t._id !== currentTrainerId),
    [trainersData?.data, currentTrainerId],
  );

  // ── Pre-fill monthlyCharge from trainer's default rate when trainer changes ─
  useEffect(() => {
    if (!selectedTrainerId) {
      setMonthlyCharge("");
      setSelectedSlots([]);
      return;
    }
    const t = trainers.find((tr) => tr._id === selectedTrainerId);
    const rate = (t as any)?.hourlyRate ?? (t as any)?.monthlyRate;
    setMonthlyCharge(rate != null ? String(rate) : "");
    setSelectedSlots([]); // reset slot selection when trainer changes
  }, [selectedTrainerId, trainers]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const assignMutation = usePostTrainersTrainerIdAssignments({
    mutation: {
      onSuccess: () => {
        const t = trainers.find((tr) => tr._id === selectedTrainerId);
        const name = t
          ? `${(t as any).userId?.firstName ?? ""} ${(t as any).userId?.lastName ?? ""}`.trim()
          : "Trainer";
        toast({
          title: "Trainer assigned",
          description: `${name} has been assigned. PT fee invoice created.`,
        });

        // Invalidate all trainer-related queries so:
        // 1. The trainer's slot counts refresh in the dropdown next time it opens
        // 2. The "Log Note" member dropdown on the trainer detail page shows the new member
        queryClient.invalidateQueries({ queryKey: getGetTrainersQueryKey() });
        if (selectedTrainerId) {
          queryClient.invalidateQueries({
            queryKey: getGetTrainersTrainerIdAssignmentsQueryKey(selectedTrainerId),
          });
          // Refresh trainer profile so CLIENT CAPACITY count updates immediately
          queryClient.invalidateQueries({
            queryKey: getGetTrainersTrainerIdQueryKey(selectedTrainerId),
          });
        }

        // Invalidate member invoices — backend auto-creates a PT fee invoice on assignment.
        // Without this, BillingTab won't show the new invoice until a manual page refresh.
        queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey({ memberId }) });

        // Refresh notification bell — trainer assigned event dispatched to owner + trainer
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });

        resetForm();
        onOpenChange(false);
        onSuccess();
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to assign trainer",
          description: err?.response?.data?.message || "Something went wrong.",
        });
      },
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const selectedTrainer = trainers.find((t) => t._id === selectedTrainerId);
  const selectedTrainerName = selectedTrainer
    ? `${(selectedTrainer as any).userId?.firstName ?? ""} ${(selectedTrainer as any).userId?.lastName ?? ""}`.trim()
    : null;

  // Derived: selected trainer's availability
  const trainerAvailability: AvailabilitySlot[] =
    ((trainers.find((t) => t._id === selectedTrainerId) as any)?.availability ?? []);

  // Group slots by day for display
  const slotsByDay = trainerAvailability.reduce<Record<number, AvailabilitySlot[]>>(
    (acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    },
    {},
  );

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

  function resetForm() {
    setSelectedTrainerId("");
    setGoal("");
    setSessionsPerWeek(undefined);
    setMonthlyCharge("");
    setSelectedSlots([]);
  }

  function handleSubmit() {
    if (!selectedTrainerId) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please select a trainer.",
      });
      return;
    }

    if (currentAssignment) {
      const confirmReplace = window.confirm(
        "This member already has an active trainer. Assigning a new trainer will end the current assignment. Continue?",
      );
      if (!confirmReplace) return;
    }

    const charge = monthlyCharge ? Number(monthlyCharge) : undefined;

    assignMutation.mutate({
      trainerId: selectedTrainerId,
      data: {
        memberId,
        branchId,
        goal: goal || undefined,
        sessionFrequencyPerWeek: sessionsPerWeek,
        scheduledSlots: selectedSlots.length > 0 ? selectedSlots : undefined,
        monthlyCharge: charge,
        currency: currency,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Trainer</DialogTitle>
          <DialogDescription>
            Select a personal trainer for this member. A PT fee invoice will be
            created automatically if a monthly charge is set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trainer selector */}
          <div className="space-y-1.5">
            <Label>
              Trainer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedTrainerId}
              onValueChange={setSelectedTrainerId}
              disabled={assignMutation.isPending || loadingTrainers}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingTrainers
                      ? "Loading trainers…"
                      : trainers.length === 0
                        ? "No available trainers"
                        : "Select a trainer"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((trainer) => {
                  const user = (trainer as any).userId;
                  const name = user
                    ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                    : trainer._id;
                  const specs: string[] = (trainer as any)?.specializations ?? [];
                  const slots =
                    (trainer as any)?.maxClients -
                    (trainer as any)?.currentClientCount;
                  const rate = (trainer as any)?.hourlyRate ?? (trainer as any)?.monthlyRate;
                  return (
                    <SelectItem key={trainer._id} value={trainer._id ?? ""}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{name}</span>
                          {specs.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {specs.slice(0, 2).join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {rate != null && (
                            <span className="text-xs text-muted-foreground">
                              {currency} {Number(rate).toLocaleString()}/mo
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {slots} slot{slots !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Show rest of fields only after trainer is selected */}
          {selectedTrainerId && (
            <>
              {/* Monthly PT charge */}
              <div className="space-y-1.5">
                <Label htmlFor="monthlyCharge">
                  PT Charge / Month ({currency})
                </Label>
                <Input
                  id="monthlyCharge"
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  disabled={assignMutation.isPending}
                  value={monthlyCharge}
                  onChange={(e) => setMonthlyCharge(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A PT fee invoice will be created automatically when set.
                  Pre-filled from trainer's default rate — override as needed.
                </p>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <Label htmlFor="trainerGoal">Goal</Label>
                <Input
                  id="trainerGoal"
                  placeholder="e.g. Weight loss, Muscle gain, Rehabilitation"
                  disabled={assignMutation.isPending}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              {/* Sessions per week */}
              <div className="space-y-1.5">
                <Label htmlFor="sessionsPerWeek">Sessions per Week</Label>
                <Select
                  value={String(sessionsPerWeek ?? "")}
                  onValueChange={(v) =>
                    setSessionsPerWeek(v ? Number(v) : undefined)
                  }
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x per week
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                                  disabled={assignMutation.isPending}
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

              {/* Summary card */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {selectedTrainerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthlyCharge && Number(monthlyCharge) > 0
                      ? `PT fee invoice of ${currency} ${Number(monthlyCharge).toLocaleString()} will be created`
                      : "No PT fee invoice (charge not set)"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={assignMutation.isPending || !selectedTrainerId}
          >
            {assignMutation.isPending ? "Assigning…" : "Assign Trainer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
