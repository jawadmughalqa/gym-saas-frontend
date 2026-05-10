import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  CreditCard,
  Clock,
  Activity,
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertCircle,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageShell from "@/components/layout/PageShell";
import {
  MembershipStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/shared/StatusBadge";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import Pagination from "@/components/shared/Pagination";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermission } from "@/hooks/use-permission";
import { formatDate, formatRelative } from "@/utils/format";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { MemberStatusPanel } from "./components/MemberStatusPanel";

// ─── Orval hooks ──────────────────────────────────────────────────────────────
import {
  useGetMembersMemberId,
  useGetMembersMemberIdSubscriptions,
  useGetMembersMemberIdCheckins,
  useGetMembersMemberIdMeasurements,
  usePostMembersMemberIdSubscriptionsSubscriptionIdFreeze,
  usePostMembersMemberIdSubscriptionsSubscriptionIdCancel,
  getGetMembersMemberIdSubscriptionsQueryKey,
  getGetMembersMemberIdQueryKey,
} from "@/api/generated/members/members";

import MemberForm from "./components/MemberForm";
import SubscriptionForm from "./components/SubscriptionForm";
import MeasurementForm from "./components/MeasurementForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ memberId }: { memberId: string }) {
  const { data: response, isLoading } = useGetMembersMemberId(memberId);

  // Backend: { success, data: { _id, firstName, ..., activeSubscription, recentCheckIns } }
  // orvalMutator returns res.data so response = { success, data: memberObject }
  const member = response?.data;

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  if (!member) return null;

  const genderLabel: Record<string, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── Status panel — spans full width, always first ───────────── */}
      <div className="md:col-span-2">
        <MemberStatusPanel
          member={member as Parameters<typeof MemberStatusPanel>[0]["member"]}
        />
      </div>

      {/* Personal info — unchanged */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <InfoRow
            label="Full Name"
            value={`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()}
          />
          <InfoRow
            label="Email"
            value={
              member.email ? (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.email}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Phone"
            value={
              member.phone ? (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.phone}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Date of Birth"
            value={
              member.dateOfBirth ? formatDate(member.dateOfBirth) : undefined
            }
          />
          <InfoRow
            label="Gender"
            value={member.gender ? genderLabel[member.gender] : undefined}
          />
          <InfoRow
            label="Joined"
            value={
              member.joinedAt ? (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(member.joinedAt)}
                </span>
              ) : undefined
            }
          />
          <InfoRow
            label="Branch"
            value={
              member.branchId ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.branchId}
                </span>
              ) : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Emergency contact — unchanged */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {member.emergencyContact ? (
            <>
              <InfoRow label="Name" value={member.emergencyContact.name} />
              <InfoRow
                label="Relationship"
                value={member.emergencyContact.relationship}
              />
              <InfoRow
                label="Phone"
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {member.emergencyContact.phone}
                  </span>
                }
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No emergency contact on file.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Health & Consents — unchanged */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consent & Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={member.consentMarketing ? "default" : "secondary"}>
            Marketing: {member.consentMarketing ? "Yes" : "No"}
          </Badge>
          <Badge
            variant={member.consentDataProcessing ? "default" : "secondary"}
          >
            Data Processing: {member.consentDataProcessing ? "Yes" : "No"}
          </Badge>
          {member.waiver && (
            <Badge variant="outline">
              Waiver signed {formatDate(member.waiver.signedAt)}
            </Badge>
          )}
          {member.healthQuestionnaire?.completedAt && (
            <Badge variant="outline">
              Health form completed{" "}
              {formatDate(member.healthQuestionnaire.completedAt)}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Notes — unchanged */}
      {member.notes && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Staff Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

function SubscriptionsTab({
  memberId,
  branchId,
}: {
  memberId: string;
  branchId: string;
}) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const { confirm, confirmProps } = useConfirm();

  const { data: subResponse, isLoading } =
    useGetMembersMemberIdSubscriptions(memberId);
  // Backend: { success, data: Subscription[] }
  const subscriptions = subResponse?.data ?? [];

  const cancelMutation =
    usePostMembersMemberIdSubscriptionsSubscriptionIdCancel({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetMembersMemberIdQueryKey(memberId),
          });
        },
      },
    });

  const [subFormOpen, setSubFormOpen] = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const columns: ColumnDef<(typeof subscriptions)[0]>[] = [
    {
      key: "plan",
      header: "Plan",
      cell: (row) => (
        <div>
          <p className="font-medium">
            {/* plan-based: show snapshot name; custom: show customLabel */}
            {row.planSnapshot?.name ??
              (row as { customLabel?: string }).customLabel ??
              row.planId ??
              "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.planSnapshot?.billingFrequency ??
              (row as { customBillingFrequency?: string })
                .customBillingFrequency ??
              ""}
          </p>
        </div>
      ),
    },
    {
      key: "finalPrice",
      header: "Amount",
      cell: (row) => {
        const price = (row as { finalPrice?: number }).finalPrice;
        const currency = (row as { currency?: string }).currency ?? "PKR";
        return price != null ? `${currency} ${price.toFixed(2)}` : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <SubscriptionStatusBadge status={row.status ?? "active"} />
      ),
    },
    {
      key: "startDate",
      header: "Start",
      hideOnMobile: true,
      cell: (row) => (row.startDate ? formatDate(row.startDate) : "—"),
    },
    {
      key: "endDate",
      header: "End",
      hideOnMobile: true,
      cell: (row) => (row.endDate ? formatDate(row.endDate) : "Ongoing"),
    },
    {
      key: "actions",
      header: "",
      width: "w-32",
      cell: (row) =>
        row.status === "active" ? (
          <div className="flex items-center gap-1 justify-end">
            {can("subscription.freeze") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubId(row._id ?? null);
                  setFreezeDialogOpen(true);
                }}
              >
                Freeze
              </Button>
            )}
            {can("subscription.cancel") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  confirm(
                    {
                      title: "Cancel subscription?",
                      description:
                        "This will cancel the subscription immediately.",
                      variant: "destructive",
                      confirmLabel: "Cancel Subscription",
                    },
                    () =>
                      cancelMutation.mutate({
                        memberId,
                        subscriptionId: row._id ?? "",
                        data: { reason: "Cancelled by staff" },
                      }),
                  );
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subscriptions.length} subscription
          {subscriptions.length !== 1 ? "s" : ""} total
        </p>
        {can("subscription.create") && (
          <Button size="sm" onClick={() => setSubFormOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Assign Plan
          </Button>
        )}
      </div>

      {!isLoading && subscriptions.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No subscriptions"
          description="Assign a membership plan to get started."
          action={
            can("subscription.create")
              ? { label: "Assign Plan", onClick: () => setSubFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={subscriptions}
          keyExtractor={(r) => r._id ?? ""}
          loading={isLoading}
          skeletonRows={3}
        />
      )}

      <SubscriptionForm
        open={subFormOpen}
        onOpenChange={setSubFormOpen}
        memberId={memberId}
        defaultBranchId={branchId} // ← add this
      />

      {freezeDialogOpen && selectedSubId && (
        <FreezeDialog
          subscriptionId={selectedSubId}
          memberId={memberId}
          open={freezeDialogOpen}
          onOpenChange={(o) => {
            setFreezeDialogOpen(o);
            if (!o) setSelectedSubId(null);
          }}
        />
      )}

      <ConfirmDialog {...confirmProps} loading={cancelMutation.isPending} />
    </div>
  );
}

// ─── Freeze Dialog ────────────────────────────────────────────────────────────

const freezeSchema = z.object({
  resumeAt: z.string().min(1, "Resume date is required"),
  reason: z.string().optional(),
});
type FreezeFormValues = z.infer<typeof freezeSchema>;

function FreezeDialog({
  subscriptionId,
  memberId,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  memberId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const freezeMutation =
    usePostMembersMemberIdSubscriptionsSubscriptionIdFreeze({
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getGetMembersMemberIdSubscriptionsQueryKey(memberId),
          });
          onOpenChange(false);
        },
      },
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FreezeFormValues>({
    resolver: zodResolver(freezeSchema),
  });

  function onSubmit(values: FreezeFormValues) {
    freezeMutation.mutate({
      memberId,
      subscriptionId,
      data: { resumeAt: values.resumeAt, reason: values.reason },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Freeze Subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resumeAt">Resume Date *</Label>
            <Input
              id="resumeAt"
              type="date"
              disabled={freezeMutation.isPending}
              {...register("resumeAt")}
            />
            {errors.resumeAt && (
              <p className="text-xs text-destructive">
                {errors.resumeAt.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freezeReason">Reason (optional)</Label>
            <Input
              id="freezeReason"
              placeholder="e.g. Travelling"
              disabled={freezeMutation.isPending}
              {...register("reason")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={freezeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={freezeMutation.isPending}>
              {freezeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Freeze
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Check-ins Tab ────────────────────────────────────────────────────────────

function CheckInsTab({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);

  const { data: checkInResponse, isLoading } = useGetMembersMemberIdCheckins(
    memberId,
    { page, limit: 20 },
  );
  // Backend: { success, data: CheckIn[], pagination }
  const checkIns = checkInResponse?.data ?? [];
  const pagination = checkInResponse?.pagination;

  const methodLabel: Record<string, string> = {
    qr: "QR Code",
    rfid: "RFID",
    manual: "Manual",
    app: "App",
  };

  const columns: ColumnDef<(typeof checkIns)[0]>[] = [
    {
      key: "timestamp",
      header: "Date & Time",
      cell: (row) => {
        // Backend sends 'timestamp' not 'checkedInAt'
        const ts = (row as { timestamp?: string }).timestamp ?? "";
        return (
          <div>
            <p>{ts ? formatDate(ts) : "—"}</p>
            <p className="text-xs text-muted-foreground">
              {ts ? new Date(ts).toLocaleTimeString() : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => (
        <Badge variant="outline">
          {methodLabel[row.method ?? ""] ?? row.method ?? "—"}
        </Badge>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (row) => {
        const result = (row as { result?: string }).result;
        return (
          <Badge variant={result === "allowed" ? "default" : "destructive"}>
            {result ?? "—"}
          </Badge>
        );
      },
    },
    {
      key: "relative",
      header: "",
      hideOnMobile: true,
      cell: (row) => {
        const ts = (row as { timestamp?: string }).timestamp ?? "";
        return (
          <span className="text-xs text-muted-foreground">
            {ts ? formatRelative(ts) : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {!isLoading && checkIns.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="No check-ins"
          description="This member hasn't checked in yet."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={checkIns}
            keyExtractor={(r) => r._id ?? ""}
            loading={isLoading}
            skeletonRows={10}
          />
          {pagination && (
            <Pagination
              meta={pagination}
              onPageChange={setPage}
              onLimitChange={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Measurements Tab ─────────────────────────────────────────────────────────

function MeasurementsTab({ memberId }: { memberId: string }) {
  const { can } = usePermission();
  const [measureFormOpen, setMeasureFormOpen] = useState(false);

  const { data: measureResponse, isLoading } =
    useGetMembersMemberIdMeasurements(memberId);
  // Backend: { success, data: Measurement[] }
  const measurements = measureResponse?.data ?? [];

  const columns: ColumnDef<(typeof measurements)[0]>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (row.date ? formatDate(row.date as string) : "—"),
    },
    {
      key: "weightKg",
      header: "Weight",
      cell: (row) => (row.weightKg != null ? `${row.weightKg} kg` : "—"),
    },
    {
      key: "heightCm",
      header: "Height",
      hideOnMobile: true,
      cell: (row) => (row.heightCm != null ? `${row.heightCm} cm` : "—"),
    },
    {
      key: "bodyFatPercent",
      header: "Body Fat",
      hideOnMobile: true,
      cell: (row) =>
        row.bodyFatPercent != null ? `${row.bodyFatPercent}%` : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {measurements.length} record{measurements.length !== 1 ? "s" : ""}
        </p>
        {can("member.update") && (
          <Button size="sm" onClick={() => setMeasureFormOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Log Measurement
          </Button>
        )}
      </div>

      {!isLoading && measurements.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No measurements"
          description="Log a measurement to start tracking progress."
          action={
            can("member.update")
              ? {
                  label: "Log Measurement",
                  onClick: () => setMeasureFormOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={measurements}
          keyExtractor={(r) => (r as { _id?: string })._id ?? ""}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <MeasurementForm
        open={measureFormOpen}
        onOpenChange={setMeasureFormOpen}
        memberId={memberId}
      />
    </div>
  );
}

// ─── MemberDetailPage ─────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const { data: response, isLoading } = useGetMembersMemberId(memberId ?? "");

  // Backend wraps in { success, data: memberObject }
  // orvalMutator returns res.data → response = { success, data: memberObject }
  const member = response?.data;
  const activeSubscription =
    (member as { activeSubscription?: unknown } | undefined)
      ?.activeSubscription ?? null;

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!member) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Member not found</h2>
          <Button variant="outline" onClick={() => navigate("/members")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
        </div>
      </PageShell>
    );
  }

  const fullName = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim();

  return (
    <PageShell>
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 mt-0.5"
          onClick={() => navigate("/members")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold truncate">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <MembershipStatusBadge status={member.status ?? "active"} />
                {activeSubscription && (
                  <span className="text-xs text-muted-foreground">
                    {(
                      activeSubscription as { planSnapshot?: { name?: string } }
                    ).planSnapshot?.name ??
                      (activeSubscription as { customLabel?: string })
                        .customLabel ??
                      "Active Plan"}
                    {" · expires "}
                    {(activeSubscription as { endDate?: string }).endDate
                      ? formatDate(
                          (activeSubscription as { endDate: string }).endDate,
                        )
                      : "ongoing"}
                  </span>
                )}
              </div>
            </div>

            {can("member.update") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="flex items-center gap-1.5"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Check-ins</span>
          </TabsTrigger>
          <TabsTrigger
            value="measurements"
            className="flex items-center gap-1.5"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Measurements</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab memberId={member._id ?? ""} />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab
            memberId={member._id ?? ""}
            branchId={member.branchId ?? ""} // ← add this
          />
        </TabsContent>
        <TabsContent value="checkins" className="mt-4">
          <CheckInsTab memberId={member._id ?? ""} />
        </TabsContent>
        <TabsContent value="measurements" className="mt-4">
          <MeasurementsTab memberId={member._id ?? ""} />
        </TabsContent>
      </Tabs>

      {/* Edit form */}
      <MemberForm
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member as Parameters<typeof MemberForm>[0]["member"]}
      />
    </PageShell>
  );
}
