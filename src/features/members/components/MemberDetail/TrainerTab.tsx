/**
 * TrainerTab
 *
 * Shows the full trainer assignment history for a member:
 *   • Current trainer card (if active assignment exists)
 *   • "Assign Trainer" / "Change Trainer" / "Remove Trainer" actions
 *   • History timeline of all past assignments
 *
 * API endpoints consumed:
 *   GET    /members/:memberId/trainer-assignments
 *   POST   /trainers/:trainerId/assignments
 *   PATCH  /trainers/:trainerId/assignments/:id
 *   PATCH  /trainers/:trainerId/assignments/:id/end
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  User,
  Plus,
  Pencil,
  UserMinus,
  Calendar,
  Dumbbell,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/format";
import { usePermission } from "@/hooks/use-permission";

import AssignTrainerDialog from "./AssignTrainerDialog";
import { EndTrainerDialog } from "./EndTrainerDialog";
import { EditAssignmentDialog } from "./EditAssignmentDialog";
import {
  useGetMembersMemberIdTrainerAssignments,
  getGetMembersMemberIdTrainerAssignmentsQueryKey,
  getGetMembersMemberIdQueryKey,
} from "@/api/generated/members/members";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrainerUser {
  firstName?: string;
  lastName?: string;
}

interface TrainerProfile {
  _id: string;
  userId?: TrainerUser;
  specializations?: string[];
  monthlyRate?: number;
  currency?: string;
}

interface AssignedBy {
  firstName?: string;
  lastName?: string;
}

export interface TrainerAssignment {
  _id: string;
  // trainerId may be a populated object or a raw string ID (before populate is wired)
  trainerId: TrainerProfile | string;
  status: "active" | "ended";
  startDate: string;
  endDate?: string;
  monthlyCharge?: number;
  currency: string;
  goal?: string;
  sessionFrequencyPerWeek?: number;
  notes?: string;
  // assignedBy/endedBy may be populated objects or raw string IDs
  assignedBy?: AssignedBy | string;
  endedBy?: AssignedBy | string;
  endReason?: string;
  createdAt: string;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isPopulatedTrainer(t: TrainerProfile | string): t is TrainerProfile {
  return typeof t === "object" && t !== null;
}

function isPopulatedStaff(u: AssignedBy | string | undefined): u is AssignedBy {
  return typeof u === "object" && u !== null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrainerTabProps {
  memberId: string;
  branchId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trainerName(t: TrainerProfile | string | undefined): string {
  if (!t) return "Unknown Trainer";
  if (!isPopulatedTrainer(t)) return "Trainer"; // raw ID — not yet populated
  return (
    `${t.userId?.firstName ?? ""} ${t.userId?.lastName ?? ""}`.trim() ||
    "Unknown Trainer"
  );
}

function trainerProfile(
  t: TrainerProfile | string | undefined,
): TrainerProfile | null {
  if (!t || !isPopulatedTrainer(t)) return null;
  return t;
}

function staffName(u: AssignedBy | string | undefined): string {
  if (!u) return "—";
  if (!isPopulatedStaff(u)) return "—"; // raw ID — not yet populated
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—";
}

function durationLabel(start: string, end?: string): string {
  const from = new Date(start);
  const to = end ? new Date(end) : new Date();
  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssignmentInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrainerTab({ memberId, branchId }: TrainerTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // ── Fetch assignments ─────────────────────────────────────────────────────
  const { data: response, isLoading } =
    useGetMembersMemberIdTrainerAssignments(memberId);
  const assignments = (response?.data ?? []) as TrainerAssignment[];

  const current = assignments.find((a) => a.status === "active") ?? null;
  const history = assignments.filter((a) => a.status === "ended");

  // ── Invalidate helper ─────────────────────────────────────────────────────
  // Invalidates both trainer assignments AND the member profile so wallet
  // balance in the Profile tab refreshes immediately after a refund-on-reassign.
  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: getGetMembersMemberIdTrainerAssignmentsQueryKey(memberId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetMembersMemberIdQueryKey(memberId),
    });
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Current trainer card ──────────────────────────────────────────── */}
      {current ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {trainerName(current.trainerId)}
                  </CardTitle>
                  {trainerProfile(current.trainerId)?.specializations
                    ?.length ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {trainerProfile(current.trainerId)!
                        .specializations!.slice(0, 3)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
              <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                Active
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-4">
            <AssignmentInfoRow
              icon={Calendar}
              label="Assigned since"
              value={`${formatDate(current.startDate)} (${durationLabel(current.startDate)})`}
            />
            {current.monthlyCharge !== undefined && (
              <AssignmentInfoRow
                icon={DollarSign}
                label="PT Charge"
                value={`${current.currency} ${current.monthlyCharge.toLocaleString()} / month`}
              />
            )}
            {current.sessionFrequencyPerWeek && (
              <AssignmentInfoRow
                icon={Clock}
                label="Sessions"
                value={`${current.sessionFrequencyPerWeek}x per week`}
              />
            )}
            {current.goal && (
              <AssignmentInfoRow
                icon={Dumbbell}
                label="Goal"
                value={current.goal}
              />
            )}
            {current.notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                <p className="text-sm">{current.notes}</p>
              </div>
            )}
          </CardContent>

          {/* Actions */}
          {can("member.update") && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Change Trainer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setEndOpen(true)}
              >
                <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                Remove Trainer
              </Button>
            </div>
          )}
        </Card>
      ) : (
        /* ── No trainer assigned ─────────────────────────────────────────── */
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No trainer assigned</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Assign a personal trainer to track PT sessions and charges.
              </p>
            </div>
            {can("member.update") && (
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Assign Trainer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── History ───────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setHistoryOpen((p) => !p)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            {historyOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Trainer History ({history.length} past assignment
            {history.length !== 1 ? "s" : ""})
          </button>

          {historyOpen && (
            <div className="mt-3 space-y-1 relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

              {history.map((a, idx) => (
                <div key={a._id} className="flex gap-4 pl-7 relative">
                  {/* Timeline dot */}
                  <div className="absolute left-[7px] top-2 h-2 w-2 rounded-full bg-muted-foreground/40 border border-background" />

                  <div className="flex-1 rounded-lg border p-3 mb-2 bg-background">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {trainerName(a.trainerId)}
                        </p>
                        {trainerProfile(a.trainerId)?.specializations
                          ?.length ? (
                          <p className="text-xs text-muted-foreground">
                            {trainerProfile(a.trainerId)!
                              .specializations!.slice(0, 2)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        Ended
                      </Badge>
                    </div>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground">From:</strong>{" "}
                        {formatDate(a.startDate)}
                      </span>
                      <span>
                        <strong className="text-foreground">To:</strong>{" "}
                        {a.endDate ? formatDate(a.endDate) : "—"}
                      </span>
                      <span>
                        <strong className="text-foreground">Duration:</strong>{" "}
                        {durationLabel(a.startDate, a.endDate)}
                      </span>
                      {a.monthlyCharge !== undefined && (
                        <span>
                          <strong className="text-foreground">Charge:</strong>{" "}
                          {a.currency} {a.monthlyCharge.toLocaleString()}
                        </span>
                      )}
                      {a.sessionFrequencyPerWeek && (
                        <span>
                          <strong className="text-foreground">Sessions:</strong>{" "}
                          {a.sessionFrequencyPerWeek}x / week
                        </span>
                      )}
                      {a.goal && (
                        <span className="col-span-2">
                          <strong className="text-foreground">Goal:</strong>{" "}
                          {a.goal}
                        </span>
                      )}
                      {a.endReason && (
                        <span className="col-span-2">
                          <strong className="text-foreground">
                            End reason:
                          </strong>{" "}
                          {a.endReason === "reassigned"
                            ? "Reassigned to new trainer"
                            : a.endReason}
                        </span>
                      )}
                      {a.assignedBy && (
                        <span className="col-span-2">
                          <strong className="text-foreground">
                            Assigned by:
                          </strong>{" "}
                          {staffName(a.assignedBy)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <AssignTrainerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        memberId={memberId}
        branchId={branchId}
        currentAssignment={current}
        onSuccess={invalidate}
      />

      {current && (
        <>
          <EndTrainerDialog
            open={endOpen}
            onOpenChange={setEndOpen}
            assignment={current}
            onSuccess={invalidate}
          />
          <EditAssignmentDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            assignment={current}
            onSuccess={invalidate}
          />
        </>
      )}
    </div>
  );
}
