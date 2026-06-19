import { differenceInDays, format, isPast, isFuture } from "date-fns";
import {
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  UserX,
  Clock,
  CalendarX,
  CalendarCheck,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { MemberStatus } from "@/types/member.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusHistoryEntry {
  status: MemberStatus;
  changedAt: string;
  reason?: string;
  freezeStartDate?: string;
  freezeEndDate?: string;
}

interface MemberStatusData {
  status: MemberStatus;
  statusChangedAt?: string;
  joinedAt: string;
  suspendedAt?: string;
  suspensionReason?: string;
  currentFreeze?: {
    freezeStartDate: string;
    freezeEndDate: string;
    reason?: string;
    notes?: string;
  };
  archivedAt?: string;
  statusHistory?: StatusHistoryEntry[];
}

interface MemberStatusPanelProps {
  member: MemberStatusData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return differenceInDays(new Date(), new Date(dateStr));
}

function daysUntil(dateStr: string): number {
  return differenceInDays(new Date(dateStr), new Date());
}

function fmt(dateStr: string): string {
  return format(new Date(dateStr), "d MMM yyyy");
}

// ─── Status config ────────────────────────────────────────────────────────────

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MemberStatus,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  active: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Active",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  suspended: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Suspended",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  frozen: {
    icon: <Snowflake className="h-4 w-4" />,
    label: "Frozen",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  inactive: {
    icon: <UserX className="h-4 w-4" />,
    label: "Inactive",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

const HISTORY_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Reactivated",
  suspended: "Suspended",
  frozen: "Frozen",
  inactive: "Deactivated",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberStatusPanel({ member }: MemberStatusPanelProps) {
  const config = STATUS_CONFIG[member.status];
  const sinceDate = member.statusChangedAt ?? member.joinedAt;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Membership Status
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Current status banner ───────────────────────────────────────── */}
        <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 font-semibold ${config.color}`}
            >
              {config.icon}
              <span>{config.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {daysSince(sinceDate)} day{daysSince(sinceDate) !== 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Since {fmt(sinceDate)}
          </p>
        </div>

        {/* ── Status-specific details ─────────────────────────────────────── */}

        {/* SUSPENDED details */}
        {member.status === "suspended" && member.suspendedAt && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CalendarX className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
              <div>
                <p className="font-medium">
                  Suspended {daysSince(member.suspendedAt)} days ago
                </p>
                <p className="text-xs text-muted-foreground">
                  Since {fmt(member.suspendedAt)}
                </p>
              </div>
            </div>

            {member.suspensionReason && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-sm">{member.suspensionReason}</p>
                </div>
              </div>
            )}

            <div className="rounded-md bg-orange-100/60 border border-orange-200 px-3 py-2">
              <p className="text-xs text-orange-700">
                Billing continues during suspension. Member must settle dues to
                reactivate.
              </p>
            </div>
          </div>
        )}

        {/* FROZEN details */}
        {member.status === "frozen" && member.currentFreeze && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Snowflake className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
              <div>
                <p className="font-medium">
                  Frozen for {daysSince(member.currentFreeze.freezeStartDate)}{" "}
                  day
                  {daysSince(member.currentFreeze.freezeStartDate) !== 1
                    ? "s"
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt(member.currentFreeze.freezeStartDate)} →{" "}
                  {fmt(member.currentFreeze.freezeEndDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <CalendarCheck className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
              <div>
                {isFuture(new Date(member.currentFreeze.freezeEndDate)) ? (
                  <>
                    <p className="font-medium text-blue-700">
                      Resumes in {daysUntil(member.currentFreeze.freezeEndDate)}{" "}
                      day
                      {daysUntil(member.currentFreeze.freezeEndDate) !== 1
                        ? "s"
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expected: {fmt(member.currentFreeze.freezeEndDate)}
                    </p>
                  </>
                ) : (
                  <p className="font-medium text-orange-600">
                    Resume date passed — manual unfreeze required
                  </p>
                )}
              </div>
            </div>

            {member.currentFreeze.reason && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-sm">{member.currentFreeze.reason}</p>
                </div>
              </div>
            )}

            {member.currentFreeze.notes && (
              <div className="flex items-start gap-2 text-sm">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-sm">{member.currentFreeze.notes}</p>
                </div>
              </div>
            )}

            <div className="rounded-md bg-blue-100/60 border border-blue-200 px-3 py-2">
              <p className="text-xs text-blue-700">
                Billing paused. Subscription expiry will extend by actual frozen
                days on reactivation.
              </p>
            </div>
          </div>
        )}

        {/* INACTIVE details */}
        {member.status === "inactive" && member.archivedAt && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <UserX className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
              <div>
                <p className="font-medium">
                  Inactive for {daysSince(member.archivedAt)} day
                  {daysSince(member.archivedAt) !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Deactivated {fmt(member.archivedAt)}
                </p>
              </div>
            </div>

            <div className="rounded-md bg-red-100/60 border border-red-200 px-3 py-2">
              <p className="text-xs text-red-700">
                All subscriptions cancelled. Member can be reactivated if they
                return.
              </p>
            </div>
          </div>
        )}

        {/* ACTIVE — member since */}
        {member.status === "active" && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
            <div>
              <p className="font-medium">
                Member for {daysSince(member.joinedAt)} day
                {daysSince(member.joinedAt) !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Joined {fmt(member.joinedAt)}
              </p>
            </div>
          </div>
        )}

        {/* ── Status history ──────────────────────────────────────────────── */}
        {member.statusHistory && member.statusHistory.length > 0 && (
          <>
            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent History
              </p>

              <div className="space-y-2">
                {[...member.statusHistory]
                  .reverse() // newest first
                  .slice(0, 5) // show last 5
                  .map((entry, i) => {
                    const entryConfig = STATUS_CONFIG[entry.status];
                    const isFreezeEntry = entry.status === 'frozen' && entry.freezeStartDate && entry.freezeEndDate;
                    const freezeDays = isFreezeEntry
                      ? differenceInDays(new Date(entry.freezeEndDate!), new Date(entry.freezeStartDate!))
                      : null;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className={`mt-0.5 ${entryConfig.color}`}>
                          {entryConfig.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">
                              {HISTORY_STATUS_LABELS[entry.status]}
                              {isFreezeEntry && freezeDays != null && (
                                <span className="ml-1 text-blue-600">({freezeDays} day{freezeDays !== 1 ? 's' : ''})</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {fmt(entry.changedAt)}
                            </span>
                          </div>
                          {isFreezeEntry && (
                            <p className="text-xs text-muted-foreground">
                              {fmt(entry.freezeStartDate!)} → {fmt(entry.freezeEndDate!)}
                            </p>
                          )}
                          {entry.reason && (
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
