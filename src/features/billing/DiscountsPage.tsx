import { useState, useMemo } from "react";
import {
  Tag,
  Edit2,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { usePermission } from "@/hooks/use-permission";
import { formatDate, formatCurrency } from "@/utils/format";
import {
  useGetDiscounts,
  usePatchDiscountsDiscountId,
  useDeleteDiscountsDiscountId,
  getGetDiscountsQueryKey,
} from "@/api/generated/discounts/discounts";
import { useQueryClient } from "@tanstack/react-query";
import DiscountForm from "./components/DiscountForm";
import { EditDiscountSheet } from "./components/EditDiscountSheet";
import type { Discount } from "@/types/billing.types";
import { toast } from "@/hooks/use-toast";
import { useTenantCurrency } from "@/hooks/use-tenant-currency";

// ─── Status helper ────────────────────────────────────────────────────────────

function getDiscountStatus(discount: Discount): "active" | "expired" | "maxed" | "inactive" {
  if (!discount.isActive) return "inactive";
  if (discount.validUntil && new Date(discount.validUntil) < new Date()) return "expired";
  if (
    discount.maxUsageCount &&
    discount.usageCount !== undefined &&
    discount.usageCount >= discount.maxUsageCount
  )
    return "maxed";
  return "active";
}

function StatusBadge({ discount }: { discount: Discount }) {
  const status = getDiscountStatus(discount);
  if (status === "active")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
        Active
      </Badge>
    );
  if (status === "expired")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 hover:bg-amber-500/20">
        Expired
      </Badge>
    );
  if (status === "maxed")
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 hover:bg-blue-500/20">
        Limit Reached
      </Badge>
    );
  return <Badge variant="secondary">Inactive</Badge>;
}

// ─── Usage progress bar ───────────────────────────────────────────────────────

function UsageBar({ discount }: { discount: Discount }) {
  const used = discount.usageCount ?? 0;
  const max = discount.maxUsageCount;

  if (!max) {
    return (
      <div className="text-sm tabular-nums text-muted-foreground">
        {used} uses
      </div>
    );
  }

  const pct = Math.min(100, (used / max) * 100);
  const isFull = pct >= 100;

  return (
    <div className="space-y-1 min-w-[80px]">
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums text-muted-foreground">
          {used} / {max}
        </span>
        <span className={`tabular-nums font-medium ${isFull ? "text-destructive" : ""}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? "bg-destructive" : pct > 75 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Inline toggle button ─────────────────────────────────────────────────────

function ToggleButton({ discount }: { discount: Discount }) {
  const queryClient = useQueryClient();
  const mutation = usePatchDiscountsDiscountId();

  const handleToggle = async () => {
    try {
      await mutation.mutateAsync({
        discountId: discount._id!,
        data: { isActive: !discount.isActive },
      });
      await queryClient.invalidateQueries({ queryKey: getGetDiscountsQueryKey() });
      toast({ title: discount.isActive ? "Discount disabled" : "Discount enabled" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update discount status" });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={mutation.isPending}
      onClick={(e) => {
        e.stopPropagation();
        handleToggle();
      }}
      title={discount.isActive ? "Disable" : "Enable"}
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : discount.isActive ? (
        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ToggleRight className="h-4 w-4 text-primary" />
      )}
    </Button>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function DiscountStats({ discounts }: { discounts: Discount[] }) {
  const total = discounts.length;
  const active = discounts.filter((d) => getDiscountStatus(d) === "active").length;
  const expired = discounts.filter((d) => getDiscountStatus(d) === "expired").length;
  const inactive = discounts.filter((d) => getDiscountStatus(d) === "inactive").length;
  const totalUsage = discounts.reduce((s, d) => s + (d.usageCount ?? 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      {[
        { label: "Total", value: total, color: "text-foreground" },
        { label: "Active", value: active, color: "text-emerald-600" },
        { label: "Expired", value: expired, color: "text-amber-600" },
        { label: "Inactive", value: inactive, color: "text-muted-foreground" },
        { label: "Total Uses", value: totalUsage, color: "text-primary" },
      ].map((s) => (
        <div
          key={s.label}
          className="bg-card border rounded-lg px-4 py-3 text-center"
        >
          <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const { currency } = useTenantCurrency();
  const { data: discountsRes, isLoading } = useGetDiscounts();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);
  const [search, setSearch] = useState("");

  const deleteMutation = useDeleteDiscountsDiscountId();

  const allDiscounts: Discount[] = discountsRes?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allDiscounts;
    const q = search.toLowerCase();
    return allDiscounts.filter(
      (d) =>
        d.code?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [allDiscounts, search]);

  async function handleDelete() {
    if (!deletingDiscount?._id) return;
    try {
      await deleteMutation.mutateAsync({ discountId: deletingDiscount._id });
      await queryClient.invalidateQueries({ queryKey: getGetDiscountsQueryKey() });
      toast({ title: "Discount deleted" });
      setDeletingDiscount(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete discount";
      toast({ variant: "destructive", title: msg });
    }
  }

  const columns: ColumnDef<Discount>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => (
        <div>
          <p className="font-mono font-semibold tracking-wide text-sm">
            {row.code}
          </p>
          {row.description && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px] truncate">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "discountType",
      header: "Value",
      cell: (row) => (
        <span className="font-semibold text-sm">
          {row.discountType === "percentage"
            ? `${row.value}%`
            : formatCurrency(row.value ?? 0, currency)}
        </span>
      ),
    },
    {
      key: "usageCount",
      header: "Usage",
      hideOnMobile: true,
      cell: (row) => <UsageBar discount={row} />,
    },
    {
      key: "maxUsagePerMember",
      header: "Per Member",
      hideOnMobile: true,
      cell: (row) =>
        row.maxUsagePerMember ? (
          <span className="text-sm tabular-nums">{row.maxUsagePerMember}×</span>
        ) : (
          <span className="text-sm text-muted-foreground">Unlimited</span>
        ),
    },
    {
      key: "validUntil",
      header: "Expires",
      hideOnMobile: true,
      cell: (row) =>
        row.validUntil ? (
          <span
            className={`text-sm ${
              new Date(row.validUntil) < new Date()
                ? "text-destructive"
                : "text-foreground"
            }`}
          >
            {formatDate(row.validUntil)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => <StatusBadge discount={row} />,
    },
    {
      key: "actions",
      header: "",
      width: "w-36",
      cell: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          {can("discount.update") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingDiscount(row);
                }}
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <ToggleButton discount={row} />
            </>
          )}
          {can("discount.delete") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingDiscount(row);
              }}
              title={
                (row.usageCount ?? 0) > 0
                  ? "Cannot delete: coupon has been used. Disable it instead."
                  : "Delete"
              }
              disabled={(row.usageCount ?? 0) > 0}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Discount Codes"
        subtitle="Manage promotional codes and discount policies"
        actions={
          can("discount.create") && (
            <Button onClick={() => setFormOpen(true)}>
              <Tag className="mr-2 h-4 w-4" />
              New Discount
            </Button>
          )
        }
      />

      {/* Stats row */}
      {!isLoading && allDiscounts.length > 0 && (
        <DiscountStats discounts={allDiscounts} />
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by code or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {!isLoading && allDiscounts.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-12 w-12" />}
          title="No discount codes"
          description="Create your first discount code to offer to members."
          action={
            can("discount.create")
              ? { label: "New Discount", onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r._id!}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      {/* Create sheet */}
      <DiscountForm open={formOpen} onOpenChange={setFormOpen} />

      {/* Edit sheet */}
      <EditDiscountSheet
        open={!!editingDiscount}
        onOpenChange={(open) => !open && setEditingDiscount(null)}
        discount={editingDiscount}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingDiscount}
        onOpenChange={(open) => !open && setDeletingDiscount(null)}
        title="Delete Discount Code"
        description={
          deletingDiscount
            ? `Are you sure you want to permanently delete the code "${deletingDiscount.code}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </PageShell>
  );
}
