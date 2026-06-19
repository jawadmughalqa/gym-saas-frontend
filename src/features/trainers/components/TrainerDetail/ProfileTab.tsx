import { useState } from "react";
import { Copy, Check, KeyRound, RefreshCw, Users, Star, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useGetTrainersTrainerId,
  useGetTrainersTrainerIdAssignments,
} from "@/api/generated/trainers/trainers";
import { orvalMutator } from "@/lib/orval-mutator";
import { useGetBranches } from "@/api/generated/branches/branches";
import { toast } from "@/hooks/use-toast";
import Stars from "./Stars";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Ratings Dialog ───────────────────────────────────────────────────────────

interface RatingEntry {
  _id: string;
  rating: number;
  review?: string;
  createdAt: string;
  memberId?: { firstName?: string; lastName?: string } | string;
  assignmentId?: { startDate?: string } | string;
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
        />
      ))}
    </div>
  );
}

function daysSince(from: string | undefined, to: string): number | null {
  if (!from) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function memberFullName(memberId: RatingEntry["memberId"]): string {
  if (!memberId || typeof memberId === "string") return "Member";
  return `${memberId.firstName ?? ""} ${memberId.lastName ?? ""}`.trim() || "Member";
}

function RatingsDialog({
  open,
  onOpenChange,
  trainerId,
  trainerName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trainerId: string;
  trainerName: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["trainer-ratings", trainerId],
    queryFn: async () => {
      const res = await orvalMutator<{ data: RatingEntry[] }>({
        url: `/trainers/${trainerId}/ratings`,
        method: "GET",
      });
      return (res as any)?.data ?? [];
    },
    enabled: open,
  });

  const ratings: RatingEntry[] = data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ratings for {trainerName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {ratings.length} {ratings.length === 1 ? "rating" : "ratings"} from members
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : ratings.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No ratings yet for this trainer.
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {ratings.map((r) => {
              const startDate =
                r.assignmentId && typeof r.assignmentId !== "string"
                  ? r.assignmentId.startDate
                  : undefined;
              const days = daysSince(startDate, r.createdAt);

              return (
                <div key={r._id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{memberFullName(r.memberId)}</p>
                      <StarRow value={r.rating} />
                    </div>
                    <span className="text-xs font-bold text-amber-500 shrink-0">
                      {r.rating}.0 / 5
                    </span>
                  </div>

                  {r.review && (
                    <p className="text-sm text-muted-foreground italic">"{r.review}"</p>
                  )}

                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Rated on {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {days !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {days === 0
                          ? "Same day as enrollment"
                          : `${days} day${days !== 1 ? "s" : ""} after enrollment`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileTab({ trainerId }: { trainerId: string }) {
  const { data, isLoading } = useGetTrainersTrainerId(trainerId);
  const trainer = data?.data;

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const allBranches = branchesData?.data ?? [];

  // Fetch active assignments to compute per-slot member counts
  const { data: assignmentsData } = useGetTrainersTrainerIdAssignments(
    trainerId,
    { status: "active" } as any,
  );
  const activeAssignments = (assignmentsData?.data ?? []) as Array<{
    scheduledSlots?: AvailabilitySlot[];
  }>;

  // ── Credentials state ─────────────────────────────────────────────────────
  // Lazy-loaded: fetched only when user clicks "Show Credentials"
  const [ratingsOpen, setRatingsOpen] = useState(false);

  const [creds, setCreds] = useState<{
    loginEmail: string;
    tempPassword: string | null;
    hasSetPassword: boolean;
  } | null>(null);
  const [credsLoading, setCredsLoading] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadCredentials() {
    setCredsLoading(true);
    try {
      const res = await orvalMutator<{ data: typeof creds }>({
        url: `/trainers/${trainerId}/credentials`,
        method: "GET",
      });
      setCreds((res as any)?.data ?? null);
    } catch {
      toast({ variant: "destructive", title: "Could not load credentials" });
    } finally {
      setCredsLoading(false);
    }
  }

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      orvalMutator<{ data: { tempPassword: string } }>({
        url: `/trainers/${trainerId}/reset-password`,
        method: "POST",
      }),
    onSuccess: (res) => {
      const newPass = (res as any)?.data?.tempPassword ?? null;
      setRevealedPassword(newPass);
      // Also update the creds panel if open
      if (creds) {
        setCreds((prev) =>
          prev ? { ...prev, tempPassword: newPass, hasSetPassword: false } : prev,
        );
      }
      toast({ title: "Password reset — copy the new password now" });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: err?.response?.data?.message || "Something went wrong.",
      });
    },
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Per-slot member count ─────────────────────────────────────────────────
  function slotMemberCount(slot: AvailabilitySlot): number {
    return activeAssignments.filter((a) =>
      (a.scheduledSlots ?? []).some(
        (s) =>
          s.day === slot.day &&
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime,
      ),
    ).length;
  }

  const trainerBranches = allBranches.filter((branch) =>
    trainer?.branchIds?.includes(branch._id!),
  );

  if (isLoading) return <CardSkeleton />;
  if (!trainer) return null;

  const availability: AvailabilitySlot[] = (trainer.availability ?? []) as AvailabilitySlot[];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── Details Card ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Assigned Branches
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {trainerBranches.length > 0 ? (
                trainerBranches.map((branch) => (
                  <Badge key={branch._id} variant="outline" className="text-xs">
                    {branch.name}
                    {branch.isHeadquarters && (
                      <span className="ml-1 text-primary">(HQ)</span>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No branches assigned
                </p>
              )}
            </div>
          </div>

          {trainer.bio && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Bio
              </p>
              <p className="text-sm mt-1">{trainer.bio}</p>
            </div>
          )}

          {trainer.experienceYears != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Experience
              </p>
              <p className="text-sm font-medium">
                {trainer.experienceYears} year
                {trainer.experienceYears !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {trainer.hourlyRate != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Monthly Rate
              </p>
              <p className="text-sm font-medium">
                {trainer.currency} {trainer.hourlyRate}/month
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Client Capacity
            </p>
            <p className="text-sm font-medium">
              {trainer.currentClientCount} / {trainer.maxClients} clients
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Rating
            </p>
            {(trainer.ratingAvg ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => setRatingsOpen(true)}
                className="flex items-center gap-2 mt-0.5 group rounded hover:bg-muted px-1 -mx-1 py-0.5 transition-colors"
                title="View rating details"
              >
                <Stars value={Math.round(trainer.ratingAvg ?? 0)} />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {trainer.ratingAvg!.toFixed(1)} ({trainer.ratingCount})
                </span>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View details →
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <Stars value={0} />
                <span className="text-sm text-muted-foreground">No ratings yet</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Skills & Certifications Card ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Skills & Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Specializations
            </p>
            {(trainer.specializations?.length ?? 0) > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {trainer.specializations!.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">None listed</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Certifications
            </p>
            {(trainer.certifications?.length ?? 0) > 0 ? (
              <ul className="space-y-1">
                {trainer.certifications!.map((c) => (
                  <li key={c} className="text-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">None listed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Login Credentials Card ──────────────────────────────────────── */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5" />
              Login Credentials
            </CardTitle>
            {!creds ? (
              <Button
                variant="outline"
                size="sm"
                onClick={loadCredentials}
                disabled={credsLoading}
              >
                {credsLoading ? "Loading…" : "Show Credentials"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCreds(null); setRevealedPassword(null); }}
              >
                Hide
              </Button>
            )}
          </div>
        </CardHeader>

        {creds && (
          <CardContent className="space-y-4">
            {/* Revealed-after-reset password banner */}
            {revealedPassword && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2">⚠ New temporary password — copy it now, it won't be shown again after you leave this page</p>
                <div className="flex items-center gap-2 rounded bg-white dark:bg-amber-900/30 border border-amber-200 px-3 py-2 font-mono text-sm">
                  <span className="flex-1 select-all">{revealedPassword}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(revealedPassword)}
                    className="text-amber-600 hover:text-amber-800 shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Login email */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Login Email</p>
              <p className="font-mono text-sm">{creds.loginEmail}</p>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Password</p>
                {creds.hasSetPassword && (
                  <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-0.5">
                    ✓ Trainer's own
                  </span>
                )}
              </div>
              {creds.tempPassword ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-sm w-full max-w-xs">
                  <span className="flex-1 select-all">{creds.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(creds.tempPassword!)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No password on record — use Reset Password below
                </p>
              )}
            </div>

            {/* Reset password */}
            <div className="pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Use Reset Password to generate a new temporary password for the trainer (e.g. if they need to log in on a new device or forgot their password).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetPasswordMutation.mutate()}
                disabled={resetPasswordMutation.isPending}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {resetPasswordMutation.isPending ? "Resetting…" : "Reset Password"}
              </Button>
            </div>
          </CardContent>
        )}

        {!creds && !credsLoading && (
          <CardContent>
            <p className="text-sm text-muted-foreground italic">
              Click "Show Credentials" to view this trainer's login details.
            </p>
          </CardContent>
        )}
      </Card>

      {/* ── Weekly Availability Card ────────────────────────────────────── */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availability.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availability.map((slot, i) => {
                const count = slotMemberCount(slot);
                return (
                  <div key={i} className="rounded-md border px-3 py-2 text-sm relative">
                    <p className="font-medium">{DAY_NAMES[slot.day]}</p>
                    <p className="text-xs text-muted-foreground">
                      {slot.startTime} – {slot.endTime}
                    </p>
                    {count > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                        <Users className="h-3 w-3" />
                        {count} member{count !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No availability set.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Ratings Dialog ──────────────────────────────────────────────── */}
      <RatingsDialog
        open={ratingsOpen}
        onOpenChange={setRatingsOpen}
        trainerId={trainer._id!}
        trainerName={`${trainer.userId?.firstName ?? ""} ${trainer.userId?.lastName ?? ""}`.trim()}
      />
    </div>
  );
}
