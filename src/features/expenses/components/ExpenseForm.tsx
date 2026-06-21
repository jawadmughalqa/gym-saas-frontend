import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetBranches } from "@/api/generated/branches/branches";
import { useCreateExpense, useUpdateExpense } from "../hooks/use-expenses";
import type { Expense } from "@/api/generated/expenses/expenses";
import { useTenantCurrency } from "@/hooks/use-tenant-currency";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  staff_salary: "Staff Salary",
  equipment_purchase: "Equipment Purchase",
  equipment_maintenance: "Equipment Maintenance",
  marketing: "Marketing",
  supplements: "Supplements",
  cleaning: "Cleaning",
  insurance: "Insurance",
  taxes: "Taxes",
  miscellaneous: "Miscellaneous",
  custom: "Custom",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

const RECURRING_LABELS: Record<string, string> = {
  none: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    branchId: z.string().min(1, "Branch is required"),
    title: z.string().min(2, "Title must be at least 2 characters").max(200),
    description: z.string().max(1000).optional(),
    category: z.string().min(1, "Category is required"),
    customCategory: z.string().max(100).optional(),
    amount: z
      .string()
      .min(1, "Amount is required")
      .transform((v) => Number(v))
      .pipe(z.number().min(0, "Amount must be 0 or greater")),
    currency: z.string().min(1),
    date: z.string().min(1, "Date is required"),
    status: z.string().min(1),
    recurring: z.string().min(1),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((d, ctx) => {
    if (
      d.category === "custom" &&
      (!d.customCategory || d.customCategory.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom category name is required",
        path: ["customCategory"],
      });
    }
  });

type FormValues = z.input<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export default function ExpenseForm({
  open,
  onOpenChange,
  expense,
}: ExpenseFormProps) {
  const isEditing = !!expense;
  const { currency } = useTenantCurrency();

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const createExpense = useCreateExpense({
    onSuccess: () => onOpenChange(false),
  });
  const updateExpense = useUpdateExpense(expense?._id ?? "", {
    onSuccess: () => onOpenChange(false),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: "",
      title: "",
      description: "",
      category: "",
      customCategory: "",
      amount: "" as unknown as string,
      currency: currency,
      date: new Date().toISOString().slice(0, 10),
      status: "pending",
      recurring: "none",
      notes: "",
    },
  });

  const categoryValue = watch("category");

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      reset({
        branchId: expense.branchId,
        title: expense.title,
        description: expense.description ?? "",
        category: expense.category,
        customCategory: expense.customCategory ?? "",
        amount: String(expense.amount),
        currency: expense.currency,
        date: expense.date.slice(0, 10),
        status: expense.status,
        recurring: expense.recurring,
        notes: expense.notes ?? "",
      });
    } else {
      reset({
        branchId: "",
        title: "",
        description: "",
        category: "",
        customCategory: "",
        amount: "" as unknown as string,
        currency: currency,
        date: new Date().toISOString().slice(0, 10),
        status: "pending",
        recurring: "none",
        notes: "",
      });
    }
  }, [expense, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    // Ensure date is properly formatted
    const formattedDate = new Date(values.date);

    const payload = {
      branchId: values.branchId,
      title: values.title,
      description: values.description || undefined,
      category: values.category,
      customCategory:
        values.category === "custom" ? values.customCategory : undefined,
      amount: Number(values.amount),
      currency: values.currency,
      date: formattedDate.toISOString(), // Send as ISO string
      status: values.status,
      recurring: values.recurring,
      notes: values.notes || undefined,
    };

    console.log("Sending payload with date:", payload.date); // Debug log

    if (isEditing) {
      await updateExpense.mutateAsync({
        expenseId: expense._id,
        data: payload,
      });
    } else {
      await createExpense.mutateAsync({ data: payload });
    }
  });

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>
            {isEditing ? "Edit Expense" : "Record Expense"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the expense details below."
              : "Record a new operational expense for your gym."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">
        <form id="expense-form" onSubmit={onSubmit} className="space-y-5">
          {/* Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="branchId">
              Branch <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("branchId")}
              onValueChange={(v) =>
                setValue("branchId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger
                id="branchId"
                className={errors.branchId ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && (
              <p className="text-xs text-destructive">
                {errors.branchId.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Monthly Office Rent"
              {...register("title")}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("category")}
              onValueChange={(v) =>
                setValue("category", v, { shouldValidate: true })
              }
            >
              <SelectTrigger
                id="category"
                className={errors.category ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Custom category name — shown only when category === 'custom' */}
          {categoryValue === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="customCategory">
                Custom Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customCategory"
                placeholder="e.g. Festival Decorations"
                {...register("customCategory")}
                className={errors.customCategory ? "border-destructive" : ""}
              />
              {errors.customCategory && (
                <p className="text-xs text-destructive">
                  {errors.customCategory.message}
                </p>
              )}
            </div>
          )}

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="1"
                placeholder="0.00"
                {...register("amount")}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message as string}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch("currency")}
                onValueChange={(v) => setValue("currency", v)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currency}>{currency}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
              className={errors.date ? "border-destructive" : ""}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Status + Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recurring">Recurring</Label>
              <Select
                value={watch("recurring")}
                onValueChange={(v) => setValue("recurring", v)}
              >
                <SelectTrigger id="recurring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRING_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {watch("recurring") !== "none" && (
                <p className="text-xs text-muted-foreground">
                  Tag only — recurring entries are not auto-created.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional notes about this expense…"
              rows={2}
              {...register("description")}
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Approval notes, vendor info, etc."
              rows={2}
              {...register("notes")}
            />
          </div>

        </form>
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" className="flex-1" disabled={isPending || isSubmitting}>
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Record Expense"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
