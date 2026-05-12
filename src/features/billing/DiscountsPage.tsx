import { useState } from "react";
import { Tag, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type ColumnDef } from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import { usePermission } from "@/hooks/use-permission";
import { formatDate, formatCurrency } from "@/utils/format";
import { useGetDiscounts } from "@/api/generated/discounts/discounts";
import DiscountToggleButton from "./components/DiscountToggleButton";
import DiscountForm from "./components/DiscountForm";
import { EditDiscountSheet } from "./components/EditDiscountSheet";
import type { Discount } from "@/types/billing.types";

export default function DiscountsPage() {
  const { can } = usePermission();
  const { data: discounts, isLoading } = useGetDiscounts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  const columns: ColumnDef<Discount>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => (
        <div>
          <p className="font-mono font-semibold tracking-wide">{row.code}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "discountType",
      header: "Value",
      cell: (row) => (
        <span className="font-medium">
          {row.discountType === "percentage"
            ? `${row.value}%`
            : formatCurrency(row.value, "USD")}
        </span>
      ),
    },
    {
      key: "usageCount",
      header: "Usage",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.usageCount}
          {row.maxUsageCount ? ` / ${row.maxUsageCount}` : ""}
        </span>
      ),
    },
    {
      key: "validUntil",
      header: "Expires",
      hideOnMobile: true,
      cell: (row) =>
        row.validUntil ? (
          <span
            className={
              new Date(row.validUntil) < new Date() ? "text-destructive" : ""
            }
          >
            {formatDate(row.validUntil)}
          </span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-32",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {can("discount.update") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingDiscount(row);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <DiscountToggleButton discount={row} />
            </>
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

      {!isLoading && (discounts?.data ?? []).length === 0 ? (
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
          data={discounts?.data ?? []}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <DiscountForm open={formOpen} onOpenChange={setFormOpen} />
      <EditDiscountSheet
        open={!!editingDiscount}
        onOpenChange={(open) => !open && setEditingDiscount(null)}
        discount={editingDiscount}
      />
    </PageShell>
  );
}