// components/EditDiscountSheet.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  usePatchDiscountsDiscountId,
  getGetDiscountsQueryKey,
  getGetDiscountsDiscountIdQueryKey,
} from "@/api/generated/discounts/discounts";
import { useQueryClient } from "@tanstack/react-query";
import type { Discount } from "@/types/billing.types";
import { formatCurrency } from "@/utils/format";

const editSchema = z.object({
  description: z.string().max(200).optional(),
  minInvoiceAmount: z.coerce.number().min(0).optional(),
  maxUsageCount: z.coerce.number().int().positive().optional(),
  maxUsagePerMember: z.coerce.number().int().positive().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditDiscountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: Discount | null;
}

export function EditDiscountSheet({
  open,
  onOpenChange,
  discount,
}: EditDiscountSheetProps) {
  const queryClient = useQueryClient();
  const updateDiscountMutation = usePatchDiscountsDiscountId();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  // Reset form when discount changes
  useEffect(() => {
    if (discount && open) {
      reset({
        description: discount.description || "",
        minInvoiceAmount: discount.minInvoiceAmount || undefined,
        maxUsageCount: discount.maxUsageCount || undefined,
        maxUsagePerMember: discount.maxUsagePerMember || undefined,
        validFrom: discount.validFrom?.split("T")[0] || "",
        validUntil: discount.validUntil?.split("T")[0] || "",
        isActive: discount.isActive,
      });
    }
  }, [discount, open, reset]);

  const isPending = updateDiscountMutation.isPending;

  async function onSubmit(values: EditFormValues) {
    if (!discount) return;

    try {
      await updateDiscountMutation.mutateAsync({
        discountId: discount._id,
        data: {
          description: values.description || undefined,
          minInvoiceAmount: values.minInvoiceAmount,
          maxUsageCount: values.maxUsageCount,
          maxUsagePerMember: values.maxUsagePerMember,
          validFrom: values.validFrom || undefined,
          validUntil: values.validUntil || undefined,
          isActive: values.isActive,
        },
      });

      // Invalidate both the list and the specific discount
      await queryClient.invalidateQueries({
        queryKey: getGetDiscountsQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetDiscountsDiscountIdQueryKey(discount._id),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update discount:", error);
    }
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  if (!discount) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-0"
      >
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">Edit Discount Code</h2>
          <p className="text-sm text-muted-foreground">
            Editing: <span className="font-mono font-semibold">{discount.code}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Note: Code and discount type cannot be changed after creation
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Read-only info */}
          <div className="bg-muted/50 p-3 rounded-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Code:</span>
              <span className="font-mono font-semibold">{discount.code}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span>
                {discount.discountType === "percentage"
                  ? `${discount.value}%`
                  : formatCurrency(discount.value, "USD")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Usage:</span>
              <span>
                {discount.usageCount}
                {discount.maxUsageCount ? ` / ${discount.maxUsageCount}` : ""}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Internal description…"
              disabled={isPending}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="minInvoiceAmount">Min Invoice Amount</Label>
              <Input
                id="minInvoiceAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="No minimum"
                disabled={isPending}
                {...register("minInvoiceAmount")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxUsageCount">Max Total Uses</Label>
              <Input
                id="maxUsageCount"
                type="number"
                min="1"
                placeholder="Unlimited"
                disabled={isPending}
                {...register("maxUsageCount")}
              />
              {errors.maxUsageCount && (
                <p className="text-xs text-destructive">
                  {errors.maxUsageCount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxUsagePerMember">Max Uses Per Member</Label>
            <Input
              id="maxUsagePerMember"
              type="number"
              min="1"
              placeholder="Unlimited"
              disabled={isPending}
              {...register("maxUsagePerMember")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                disabled={isPending}
                {...register("validFrom")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                disabled={isPending}
                {...register("validUntil")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive codes cannot be applied to invoices.
              </p>
            </div>
            <Switch
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v)}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}