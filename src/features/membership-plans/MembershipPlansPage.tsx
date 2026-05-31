import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  RotateCcw,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";

import {
  useGetMembershipPlans,
  usePostMembershipPlans,
  usePatchMembershipPlansPlanId,
  useDeleteMembershipPlansPlanId,
  getGetMembershipPlansQueryKey,
} from "@/api/generated/membership-plans/membership-plans";
import { api } from "@/lib/axios";
import type {
  MembershipPlan,
  CreateMembershipPlanRequest,
} from "@/api/generated/schemas";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permission";
import { CURRENCY } from "@/config/tenant.config";
import { PlanFormDialog } from "./components/PlanFormDialog";
import { ArchivePlanDialog } from "./components/ArchivePlanDialog";
import RestorePlanDialog from "./components/RestorePlanDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  one_time: "One-Time",
};

const FREQUENCY_COLORS: Record<string, string> = {
  daily: "bg-purple-100 text-purple-700",
  weekly: "bg-blue-100 text-blue-700",
  monthly: "bg-green-100 text-green-700",
  quarterly: "bg-yellow-100 text-yellow-700",
  semi_annual: "bg-orange-100 text-orange-700",
  annual: "bg-red-100 text-red-700",
  one_time: "bg-gray-100 text-gray-700",
};

// ─── Plan Card Component ──────────────────────────────────────────────────────

// Backend returns activeSubscriptionCount as an extra field not in the generated schema
type PlanWithCount = MembershipPlan & { activeSubscriptionCount?: number };

interface PlanCardProps {
  plan: PlanWithCount;
  canUpdate: boolean;
  canArchive: boolean;
  canMutate: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

function PlanCard({
  plan,
  canUpdate,
  canArchive,
  canMutate,
  onEdit,
  onArchive,
  onRestore,
}: PlanCardProps) {
  const freq = plan.billingFrequency ?? "";
  const label = FREQUENCY_LABELS[freq] ?? freq;
  const color = FREQUENCY_COLORS[freq] ?? "bg-gray-100 text-gray-700";
  const isArchived = plan.isArchived;
  const activeCount = plan.activeSubscriptionCount ?? 0;

  return (
    <Card className={isArchived ? "opacity-70 bg-muted/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base truncate">{plan.name}</CardTitle>
            {plan.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {plan.description}
              </p>
            )}
          </div>

          {canMutate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Plan actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Edit - only for active plans (not archived) */}
                {!isArchived && canUpdate && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}

                {/* Archive - only for active plans */}
                {!isArchived && canArchive && (
                  <DropdownMenuItem
                    onClick={onArchive}
                    className="text-destructive focus:text-destructive"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}

                {/* Restore - only for archived plans */}
                {isArchived && canArchive && (
                  <DropdownMenuItem onClick={onRestore}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {plan.currency ?? CURRENCY} {(plan.basePrice ?? 0).toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {label.toLowerCase()}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
          >
            {label}
          </span>

          {plan.durationDays && (
            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
              {plan.durationDays}d duration
            </span>
          )}

          {(plan.maxFreezes ?? 0) > 0 && (
            <span className="inline-flex items-center rounded-full bg-cyan-100 text-cyan-700 px-2.5 py-0.5 text-xs font-medium">
              {plan.maxFreezes} freeze{(plan.maxFreezes ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {plan.features && plan.features.length > 0 && (
          <ul className="space-y-1">
            {plan.features.slice(0, 4).map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                {f}
              </li>
            ))}
            {plan.features.length > 4 && (
              <li className="text-xs text-muted-foreground pl-4">
                +{plan.features.length - 4} more
              </li>
            )}
          </ul>
        )}

        {plan?.branchPricingOverrides &&
          plan?.branchPricingOverrides?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {plan?.branchPricingOverrides?.length} branch price override
              {plan?.branchPricingOverrides?.length > 1 ? "s" : ""}
            </p>
          )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                !isArchived && plan.isActive ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isArchived ? "Archived" : plan.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {!isArchived && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              activeCount > 0 ? "text-primary" : "text-muted-foreground"
            }`}>
              <Users className="h-3 w-3" />
              <span>{activeCount} active</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembershipPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const canCreate = can("plan.create");
  const canUpdate = can("plan.update");
  const canArchive = can("plan.archive");
  const canMutate = canUpdate || canArchive;

  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanWithCount | null>(null);
  const [archivePlan, setArchivePlan] = useState<PlanWithCount | null>(null);
  const [restorePlan, setRestorePlan] = useState<PlanWithCount | null>(null);

  const {
    data: listResponse,
    isLoading,
    isError,
  } = useGetMembershipPlans(
    { includeArchived: true },
    { query: { staleTime: 0 } },
  );

  const allPlans: PlanWithCount[] = (listResponse?.data ?? []) as PlanWithCount[];

  const plans = allPlans.filter((plan) =>
    showArchived ? plan.isArchived === true : plan.isArchived !== true,
  );

  const createMutation = usePostMembershipPlans({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembershipPlansQueryKey(),
        });
        setCreateOpen(false);
        toast({
          title: "Plan created",
          description: "Membership plan created successfully.",
        });
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Failed to create plan.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const updateMutation = usePatchMembershipPlansPlanId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembershipPlansQueryKey(),
        });
        setEditPlan(null);
        toast({
          title: "Plan updated",
          description: "Membership plan updated successfully.",
        });
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        const message =
          error?.response?.data?.message ?? "Failed to update plan.";

        toast({
          title: "Cannot Update Plan",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const archiveMutation = useDeleteMembershipPlansPlanId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getGetMembershipPlansQueryKey(),
        });
        setArchivePlan(null);
        toast({
          title: "Plan archived",
          description: "Membership plan archived successfully.",
        });
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        const message =
          error?.response?.data?.message ?? "Failed to archive plan.";

        toast({
          title: "Cannot Archive Plan",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      api.post(`/membership-plans/${planId}/restore`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getGetMembershipPlansQueryKey(),
      });
      setRestorePlan(null);
      toast({
        title: "Plan restored",
        description: "Membership plan restored successfully.",
      });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      const message =
        error?.response?.data?.message ?? "Failed to restore plan.";
      toast({
        title: "Cannot Restore Plan",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: CreateMembershipPlanRequest) => {
    createMutation.mutate({ data });
  };

  const handleUpdate = (data: CreateMembershipPlanRequest) => {
    if (!editPlan?._id) return;
    updateMutation.mutate({ planId: editPlan._id, data });
  };

  const handleArchive = () => {
    if (!archivePlan?._id) return;
    archiveMutation.mutate({ planId: archivePlan._id });
  };

  const handleRestore = () => {
    if (!restorePlan?._id) return;
    restoreMutation.mutate({ planId: restorePlan._id });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Membership Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage pricing plans available to your gym members.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label
              htmlFor="show-archived"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {showArchived ? "Showing Archived Plans" : "Showing Active Plans"}
            </Label>
          </div>

          {!showArchived && canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Plan
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load membership plans. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium text-muted-foreground">
            {showArchived
              ? "No archived plans found"
              : "No membership plans found"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {showArchived
              ? "Archived plans will appear here when you archive them."
              : "Create your first plan to get started."}
          </p>
          {!showArchived && canCreate && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              canUpdate={canUpdate}
              canArchive={canArchive}
              canMutate={canMutate}
              onEdit={() => setEditPlan(plan)}
              onArchive={() => setArchivePlan(plan)}
              onRestore={() => setRestorePlan(plan)}
            />
          ))}
        </div>
      )}

      <PlanFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      <PlanFormDialog
        open={!!editPlan}
        onOpenChange={(open) => {
          if (!open) setEditPlan(null);
        }}
        defaultValues={editPlan ?? undefined}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isPending}
      />

      <ArchivePlanDialog
        open={!!archivePlan}
        planName={archivePlan?.name ?? ""}
        activeSubscriptionCount={archivePlan?.activeSubscriptionCount ?? 0}
        isSubmitting={archiveMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchivePlan(null)}
      />

      <RestorePlanDialog
        open={!!restorePlan}
        planName={restorePlan?.name ?? ""}
        isSubmitting={restoreMutation.isPending}
        onConfirm={handleRestore}
        onCancel={() => setRestorePlan(null)}
      />
    </div>
  );
}
