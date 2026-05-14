import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useGetTrainers } from "@/api/generated/trainers/trainers";
import { usePostTrainersTrainerIdAssignments } from "@/api/generated/trainers/trainers";
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
import { CURRENCY } from "@/config/tenant.config";

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
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number | undefined>();
  const [monthlyCharge, setMonthlyCharge] = useState<string>("");

  // ── Fetch trainers ─────────────────────────────────────────────────────────
  const { data: trainersData, isLoading: loadingTrainers } = useGetTrainers(
    {
      status: "active",
      availableOnly: true,
      ...(branchId ? { branchId } : {}),
      limit: 100,
    },
    { query: { enabled: open } },
  );
  const trainers = trainersData?.data ?? [];

  // ── Pre-fill monthlyCharge from trainer's monthlyRate when trainer changes ─
  useEffect(() => {
    if (!selectedTrainerId) {
      setMonthlyCharge("");
      return;
    }
    const t = trainers.find((tr) => tr._id === selectedTrainerId);
    const rate = (t as any)?.monthlyRate;
    setMonthlyCharge(rate != null ? String(rate) : "");
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

  function resetForm() {
    setSelectedTrainerId("");
    setGoal("");
    setSessionsPerWeek(undefined);
    setMonthlyCharge("");
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
        monthlyCharge: charge,
        currency: CURRENCY,
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
                  const rate = (trainer as any)?.monthlyRate;
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
                              {CURRENCY} {Number(rate).toLocaleString()}/mo
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
                  PT Charge / Month ({CURRENCY})
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

              {/* Summary card */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                <User className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {selectedTrainerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {monthlyCharge && Number(monthlyCharge) > 0
                      ? `PT fee invoice of ${CURRENCY} ${Number(monthlyCharge).toLocaleString()} will be created`
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
