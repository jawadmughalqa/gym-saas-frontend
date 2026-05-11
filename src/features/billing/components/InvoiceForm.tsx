import { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown, Loader2, Plus, Trash2, UserCircle, Tag } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useCreateInvoice } from '../hooks/use-billing';
import { useGetMembers } from '@/api/generated/members/members';
import { useGetBranches } from '@/api/generated/branches/branches';
import { usePostDiscountsValidate } from '@/api/generated/discounts/discounts';
import type { ValidateDiscountResponse } from '@/api/generated/discounts/discounts';

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  type:        z.enum(['subscription', 'personal_training', 'product', 'late_fee', 'addon', 'other']),
  description: z.string().min(1, 'Description required'),
  quantity:    z.coerce.number().positive('Must be > 0'),
  unitPrice:   z.coerce.number().min(0, 'Must be ≥ 0'),
  taxRate:     z.coerce.number().min(0).max(100).optional(),
});

const formSchema = z.object({
  memberId:                   z.string().min(1, 'Member is required'),
  branchId:                   z.string().min(1, 'Branch is required'),
  currency:                   z.string().default('USD'),
  dueDate:                    z.string().optional(),
  discountCode:               z.string().optional(),
  invoiceLevelDiscountAmount: z.coerce.number().min(0).optional(),
  memo:                       z.string().max(500).optional(),
  notes:                      z.string().max(1000).optional(),
  issueImmediately:           z.boolean().default(false),
  lineItems:                  z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMemberId?: string;
  defaultBranchId?: string;
}

// ─── MemberCombobox ───────────────────────────────────────────────────────────

interface MemberComboboxProps {
  value: string;
  onChange: (id: string) => void;
  /** Only fetch + show members belonging to this branch */
  branchId: string;
  disabled?: boolean;
}

function MemberCombobox({ value, onChange, branchId, disabled }: MemberComboboxProps) {
  const [open, setOpen] = useState(false);

  const { data: membersData, isLoading } = useGetMembers(
    { limit: 100, status: 'active', branchId },
    {
      query: {
        // Only run when a branch has actually been selected
        enabled: !!branchId,
        staleTime: 1000 * 60,
      },
    },
  );
  const members = membersData?.data ?? [];

  const selected = members.find((m) => m._id === value);
  const triggerLabel = selected
    ? `${selected.firstName} ${selected.lastName}`
    : !branchId
    ? 'Select a branch first'
    : 'Select a member…';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          // Disabled when no branch selected, loading, or parent says disabled
          disabled={disabled || !branchId}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const m = members.find((m) => m._id === itemValue);
            if (!m) return 0;
            const haystack = `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name or email…" />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading members…
              </div>
            )}
            {!isLoading && <CommandEmpty>No members found for this branch.</CommandEmpty>}
            {!isLoading && members.length > 0 && (
              <CommandGroup>
                {members.map((m) => (
                  <CommandItem
                    key={m._id}
                    value={m._id}
                    onSelect={(id) => { onChange(id); setOpen(false); }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Check
                      className={cn('h-4 w-4 shrink-0', value === m._id ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                      {m.firstName[0]}{m.lastName[0]}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {m.firstName} {m.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {m.email}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── DiscountValidation ───────────────────────────────────────────────────────

interface DiscountValidationResult {
  isValid: boolean;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
  discountData?: ValidateDiscountResponse;
}

// ─── InvoiceForm ──────────────────────────────────────────────────────────────

export default function InvoiceForm({ open, onOpenChange, defaultMemberId, defaultBranchId }: InvoiceFormProps) {
  const createInvoice = useCreateInvoice({ onSuccess: () => onOpenChange(false) });
  const validateDiscountMutation = usePostDiscountsValidate();
  const isPending = createInvoice.isPending || validateDiscountMutation.isPending;

  // Discount validation state
  const [discountValidation, setDiscountValidation] = useState<DiscountValidationResult | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Branches — load all active ones upfront (small list)
  const { data: branchesData, isLoading: branchesLoading } = useGetBranches(
    { limit: 100, status: 'active' },
    { query: { staleTime: 1000 * 60 } },
  );
  const branches = branchesData?.data ?? [];

  const {
    register, handleSubmit, control, setValue, watch, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: defaultMemberId ?? '',
      branchId: defaultBranchId ?? '',
      currency: 'USD',
      issueImmediately: false,
      lineItems: [{ type: 'subscription', description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const lineItems  = watch('lineItems');
  const currency   = watch('currency');
  const branchId   = watch('branchId');   // drives member query
  const memberId   = watch('memberId');
  const discountCode = watch('discountCode');
  const manualDiscountAmt = Number(watch('invoiceLevelDiscountAmount')) || 0;

  // Calculate subtotal and tax
  const subtotal   = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const taxTotal   = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * ((Number(item.taxRate) || 0) / 100), 0);
  
  // Determine which discount to apply (validated discount OR manual discount)
  const effectiveDiscountAmount = discountValidation?.isValid && discountValidation.discountAmount 
    ? discountValidation.discountAmount 
    : manualDiscountAmt;
  
  const total = subtotal + taxTotal - effectiveDiscountAmount;

  // Validate discount code when it changes
  useEffect(() => {
    async function validateDiscount() {
      if (!discountCode || discountCode.trim() === '') {
        setDiscountValidation(null);
        return;
      }

      if (subtotal <= 0) {
        setDiscountValidation({
          isValid: false,
          message: 'Add line items before applying discount',
        });
        return;
      }

      setValidatingDiscount(true);
      try {
        const result = await validateDiscountMutation.mutateAsync({
          data: {
            code: discountCode,
            amount: subtotal,
          },
        });

        // Check if discount is valid
        if (result.isValid) {
          setDiscountValidation({
            isValid: true,
            discountAmount: result.discountedAmount,
            finalAmount: result.finalAmount,
            message: `Discount applied! You save ${formatCurrency(subtotal - result.finalAmount, currency)}`,
            discountData: result,
          });
          
          // Clear manual discount if a code is applied
          if (manualDiscountAmt > 0) {
            setValue('invoiceLevelDiscountAmount', 0);
          }
        } else {
          setDiscountValidation({
            isValid: false,
            message: result.message || 'Invalid or expired discount code',
          });
        }
      } catch (error) {
        console.error('Discount validation error:', error);
        setDiscountValidation({
          isValid: false,
          message: 'Failed to validate discount code',
        });
      } finally {
        setValidatingDiscount(false);
      }
    }

    // Debounce validation to avoid too many requests
    const timeoutId = setTimeout(() => {
      validateDiscount();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [discountCode, subtotal, currency]);

  // When manual discount is changed, clear validated discount
  const handleManualDiscountChange = (value: number) => {
    if (discountValidation?.isValid) {
      setDiscountValidation(null);
      setValue('discountCode', '');
    }
    setValue('invoiceLevelDiscountAmount', value);
  };

  function onSubmit(values: FormValues) {
    // Use validated discount amount if available
    const finalDiscountAmount = discountValidation?.isValid && discountValidation.discountAmount
      ? discountValidation.discountAmount
      : values.invoiceLevelDiscountAmount;

    createInvoice.mutate({
      memberId:   values.memberId,
      branchId:   values.branchId,
      currency:   values.currency,
      dueDate:    values.dueDate || undefined,
      discountCode: discountValidation?.isValid ? values.discountCode : undefined,
      invoiceLevelDiscountAmount: finalDiscountAmount,
      memo:       values.memo || undefined,
      notes:      values.notes || undefined,
      issueImmediately: values.issueImmediately,
      lineItems:  values.lineItems.map((li) => ({
        type:        li.type,
        description: li.description,
        quantity:    li.quantity,
        unitPrice:   li.unitPrice,
        taxRate:     li.taxRate,
      })),
    });
  }

  function handleClose(val: boolean) {
    if (!val) {
      reset();
      setDiscountValidation(null);
    }
    onOpenChange(val);
  }

  const LINE_ITEM_TYPES = [
    { value: 'subscription',      label: 'Subscription' },
    { value: 'personal_training', label: 'Personal Training' },
    { value: 'product',           label: 'Product' },
    { value: 'late_fee',          label: 'Late Fee' },
    { value: 'addon',             label: 'Add-on' },
    { value: 'other',             label: 'Other' },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">Create Invoice</h2>
          <p className="text-sm text-muted-foreground">Add line items and billing details.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

          {/* ── Invoice details ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Invoice Details
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Step 1 — Branch */}
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Select
                  value={branchId}
                  onValueChange={(v) => {
                    setValue('branchId', v, { shouldValidate: true });
                    // Clear member whenever branch changes — old selection is invalid
                    if (memberId) setValue('memberId', '', { shouldValidate: false });
                  }}
                  disabled={isPending || branchesLoading}
                >
                  <SelectTrigger className={errors.branchId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={branchesLoading ? 'Loading…' : 'Select a branch'} />
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
                  <p className="text-xs text-destructive">{errors.branchId.message}</p>
                )}
              </div>

              {/* Step 2 — Member (filtered by branch) */}
              <div className="space-y-1.5">
                <Label>
                  Member *{' '}
                  {!branchId && (
                    <span className="text-xs font-normal text-muted-foreground">
                      — select a branch first
                    </span>
                  )}
                </Label>
                <MemberCombobox
                  value={memberId}
                  onChange={(id) => setValue('memberId', id, { shouldValidate: true })}
                  branchId={branchId}
                  disabled={isPending}
                />
                {errors.memberId && (
                  <p className="text-xs text-destructive">{errors.memberId.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" placeholder="USD" disabled={isPending} {...register('currency')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" disabled={isPending} {...register('dueDate')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="memo">Memo</Label>
              <Textarea id="memo" placeholder="Visible on invoice…" disabled={isPending} {...register('memo')} />
            </div>
          </section>

          <Separator />

          {/* ── Line items ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Line Items</h3>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => append({ type: 'other', description: '', quantity: 1, unitPrice: 0, taxRate: 0 })}
                disabled={isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            {errors.lineItems?.root && (
              <p className="text-xs text-destructive">{errors.lineItems.root.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-3 space-y-3 relative">
                  {fields.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2 pr-8">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={watch(`lineItems.${index}.type`)}
                        onValueChange={(v) => setValue(`lineItems.${index}.type`, v as FormValues['lineItems'][0]['type'])}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LINE_ITEM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description *</Label>
                      <Input
                        className={`h-8 text-xs ${errors.lineItems?.[index]?.description ? 'border-destructive' : ''}`}
                        placeholder="e.g. Monthly membership"
                        disabled={isPending}
                        {...register(`lineItems.${index}.description`)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input type="number" min="0.01" step="0.01" className="h-8 text-xs" disabled={isPending} {...register(`lineItems.${index}.quantity`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price *</Label>
                      <Input type="number" min="0" step="0.01" className="h-8 text-xs" disabled={isPending} {...register(`lineItems.${index}.unitPrice`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input type="number" min="0" max="100" step="0.01" className="h-8 text-xs" placeholder="0" disabled={isPending} {...register(`lineItems.${index}.taxRate`)} />
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    Line total:{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(
                        (Number(lineItems[index]?.quantity) || 0) *
                        (Number(lineItems[index]?.unitPrice) || 0) *
                        (1 + (Number(lineItems[index]?.taxRate) || 0) / 100),
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Discounts & totals ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Discount & Totals</h3>
            
            {/* Discount Code Input with Validation Status */}
            <div className="space-y-1.5">
              <Label htmlFor="discountCode">Discount Code</Label>
              <div className="relative">
                <Input
                  id="discountCode"
                  placeholder="Enter discount code (e.g., SUMMER25)"
                  disabled={isPending || validatingDiscount || manualDiscountAmt > 0}
                  className={cn(
                    discountValidation?.isValid && "border-green-500 pr-20",
                    discountValidation?.isValid === false && "border-destructive pr-20"
                  )}
                  {...register('discountCode')}
                />
                {validatingDiscount && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {discountValidation?.isValid && !validatingDiscount && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              
              {/* Discount validation message */}
              {discountValidation && (
                <p className={cn(
                  "text-xs",
                  discountValidation.isValid ? "text-green-600" : "text-destructive"
                )}>
                  {discountValidation.message}
                </p>
              )}
              
              {/* Show discount details if valid */}
              {discountValidation?.isValid && discountValidation.discountData && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md text-xs space-y-1">
                  <p className="text-green-700 dark:text-green-400 font-medium">
                    ✨ Discount Applied!
                  </p>
                  <div className="flex justify-between text-green-600 dark:text-green-500">
                    <span>Original amount:</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-500">
                    <span>Discount:</span>
                    <span>-{formatCurrency(subtotal - (discountValidation.discountData.finalAmount || 0), currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700 dark:text-green-400">
                    <span>Final after discount:</span>
                    <span>{formatCurrency(discountValidation.discountData.finalAmount || 0, currency)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Discount - Disabled when code is applied */}
            <div className="space-y-1.5">
              <Label htmlFor="invoiceLevelDiscountAmount">
                Manual Discount ({currency})
                {discountValidation?.isValid && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Disabled - discount code already applied)
                  </span>
                )}
              </Label>
              <Input
                id="invoiceLevelDiscountAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={isPending || discountValidation?.isValid}
                value={manualDiscountAmt}
                onChange={(e) => handleManualDiscountChange(Number(e.target.value))}
              />
            </div>

            {/* Totals Display */}
            <div className="rounded-md bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatCurrency(taxTotal, currency)}</span>
                </div>
              )}
              {effectiveDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(effectiveDiscountAmount, currency)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className={cn(
                  discountValidation?.isValid && "text-green-600"
                )}>
                  {formatCurrency(total, currency)}
                </span>
              </div>
              
              {/* Savings highlight */}
              {discountValidation?.isValid && discountValidation.discountAmount && (
                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 text-center">
                    🎉 You're saving {formatCurrency(discountValidation.discountAmount, currency)} with this discount!
                  </p>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* ── Options ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Issue immediately</p>
                <p className="text-xs text-muted-foreground">Skip draft state and issue the invoice directly.</p>
              </div>
              <Switch
                checked={watch('issueImmediately')}
                onCheckedChange={(v) => setValue('issueImmediately', v)}
                disabled={isPending}
              />
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => handleClose(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || (discountCode && !discountValidation?.isValid)}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}