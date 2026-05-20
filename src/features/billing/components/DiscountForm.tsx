// components/DiscountForm.tsx (your existing file with proper exports)
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePostDiscounts, getGetDiscountsQueryKey } from "@/api/generated/discounts/discounts";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateDiscountDto } from "@/types/billing.types";

const createSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(200).optional(),
  discountType: z.enum(["percentage", "fixed_amount"]),
  value: z.coerce.number().positive("Must be positive"),
  scope: z.enum(["invoice", "line_item", "both"]).default("invoice"),
  minInvoiceAmount: z.coerce.number().min(0).optional(),
  maxUsageCount: z.coerce.number().int().positive().optional(),
  maxUsagePerMember: z.coerce.number().int().positive().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CreateFormValues = z.infer<typeof createSchema>;

interface DiscountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DiscountForm({ open, onOpenChange }: DiscountFormProps) {
  const queryClient = useQueryClient();
  const createDiscountMutation = usePostDiscounts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      discountType: "percentage",
      scope: "invoice",
      isActive: true,
    },
  });

  const isPending = createDiscountMutation.isPending;

  async function onSubmit(values: CreateFormValues) {
    const dto: CreateDiscountDto = {
      code: values.code.toUpperCase(),
      description: values.description || undefined,
      discountType: values.discountType,
      value: values.value,
      scope: values.scope,
      minInvoiceAmount: values.minInvoiceAmount,
      maxUsageCount: values.maxUsageCount,
      maxUsagePerMember: values.maxUsagePerMember,
      validFrom: values.validFrom || undefined,
      validUntil: values.validUntil || undefined,
      isActive: values.isActive,
    };

    try {
      await createDiscountMutation.mutateAsync({ data: dto });
      await queryClient.invalidateQueries({
        queryKey: getGetDiscountsQueryKey(),
      });
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Failed to create discount:", error);
    }
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const discountType = watch("discountType");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-0"
      >
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">Create Discount Code</h2>
          <p className="text-sm text-muted-foreground">
            Configure a new discount for invoices.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              placeholder="SUMMER25"
              disabled={isPending}
              className={`uppercase ${errors.code ? "border-destructive" : ""}`}
              {...register("code")}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional internal description…"
              disabled={isPending}
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select
                value={watch("discountType")}
                onValueChange={(v) =>
                  setValue("discountType", v as "percentage" | "fixed_amount")
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">
                Value * {discountType === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                disabled={isPending}
                className={errors.value ? "border-destructive" : ""}
                {...register("value")}
              />
              {errors.value && (
                <p className="text-xs text-destructive">
                  {errors.value.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Applies To</Label>
            <Select
              value={watch("scope")}
              onValueChange={(v) =>
                setValue("scope", v as "invoice" | "line_item" | "both")
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Whole Invoice</SelectItem>
                <SelectItem value="line_item">Line Items</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
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
              Create Discount
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}