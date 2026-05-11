/**
 * AssignTrainerSection
 *
 * Collapsible section shown during member CREATION only.
 * Lets staff optionally pick a trainer and set a goal + sessions/week.
 *
 * On submit the parent fires:
 *   POST /trainers/:trainerId/assignments  { memberId, branchId, goal, sessionFrequencyPerWeek }
 *
 * This component only manages form state — the API call lives in MemberForm/index.tsx.
 */

import { useState } from "react";
import { useController, type Control, type FieldErrors } from "react-hook-form";
import { ChevronDown, ChevronUp, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTrainers } from "@/api/generated/trainers/trainers";
import type { MemberFormValues } from "../MemberForm/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  control: Control<MemberFormValues>;
  errors: FieldErrors<MemberFormValues>;
  isPending: boolean;
  branchId?: string; // filter trainers by selected branch
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignTrainerDialog({
  control,
  errors,
  isPending,
  branchId,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // ── Fetch trainers only when section is opened ────────────────────────────
  const { data: trainersData, isLoading: loadingTrainers } = useGetTrainers(
    {
      status: "active",
      availableOnly: true,
      ...(branchId ? { branchId } : {}),
      limit: 100,
    },
    { query: { enabled: expanded } },
  );
  const trainers = trainersData?.data ?? [];

  // ── Controlled fields ─────────────────────────────────────────────────────
  const { field: enabledField } = useController({
    control,
    name: "trainer.enabled",
  });
  const { field: trainerField } = useController({
    control,
    name: "trainer.trainerId",
  });
  const { field: goalField } = useController({ control, name: "trainer.goal" });
  const { field: sessionsField } = useController({
    control,
    name: "trainer.sessionFrequencyPerWeek",
  });

  // ── Toggle ────────────────────────────────────────────────────────────────
  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    enabledField.onChange(next);
    if (!next) {
      trainerField.onChange("");
      goalField.onChange("");
      sessionsField.onChange(undefined);
    }
  }

  // ── Selected trainer display name ─────────────────────────────────────────
  const selectedTrainer = trainers.find((t) => t._id === trainerField.value);
  const trainerName = selectedTrainer
    ? `${(selectedTrainer as any).userId?.firstName ?? ""} ${(selectedTrainer as any).userId?.lastName ?? ""}`.trim()
    : null;

  return (
    <section className="space-y-3">
      {/* ── Toggle button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
          expanded
            ? "border-primary bg-primary/5 text-primary"
            : "border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2">
          {!expanded && <Plus className="h-4 w-4" />}
          <div>
            <p className="text-sm font-medium">
              {expanded ? "Assign Trainer" : "Assign Trainer (optional)"}
            </p>
            {!expanded && (
              <p className="text-xs opacity-70">
                Assign a personal trainer during registration
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>

      {/* ── Expanded content ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="rounded-lg border p-4 space-y-4">
          {/* Trainer selector */}
          <div className="space-y-1.5">
            <Label>
              Trainer <span className="text-destructive">*</span>
            </Label>
            <Select
              value={trainerField.value as string}
              onValueChange={(v) => trainerField.onChange(v)}
              disabled={isPending || loadingTrainers}
            >
              <SelectTrigger
                className={
                  errors.trainer?.trainerId ? "border-destructive" : ""
                }
              >
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
                  const specs: string[] =
                    (trainer as any)?.specializations ?? [];
                  const slots =
                    (trainer as any)?.maxClients -
                    (trainer as any)?.currentClientCount;
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
                        <span className="text-xs text-muted-foreground shrink-0">
                          {slots} slot{slots !== 1 ? "s" : ""} left
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.trainer?.trainerId && (
              <p className="text-xs text-destructive">
                {errors.trainer.trainerId.message}
              </p>
            )}
          </div>

          {/* Show rest of fields only after trainer is selected */}
          {trainerField?.value && (
            <>
              {/* Goal */}
              <div className="space-y-1.5">
                <Label htmlFor="trainerGoal">Goal</Label>
                <Input
                  id="trainerGoal"
                  placeholder="e.g. Weight loss, Muscle gain, Rehabilitation"
                  disabled={isPending}
                  value={goalField.value as string}
                  onChange={(e) => goalField.onChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  What does the member want to achieve with this trainer?
                </p>
              </div>

              {/* Sessions per week */}
              <div className="space-y-1.5">
                <Label htmlFor="sessionsPerWeek">Sessions per Week</Label>
                <Select
                  value={String(sessionsField.value ?? "")}
                  onValueChange={(v) =>
                    sessionsField.onChange(v ? Number(v) : undefined)
                  }
                  disabled={isPending}
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
                    {trainerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Will be assigned after member is created
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
