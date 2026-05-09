import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/utils/format';
import { useCreateInvoice } from '../hooks/use-billing';

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  type:        z.enum(['subscription', 'personal_training', 'product', 'late_fee', 'addon', 'other']),
  description: z.string().min(1, 'Description required'),
  quantity:    z.coerce.number().positive('Must be > 0'),
  unitPrice:   z.coerce.number().min(0, 'Must be ≥ 0'),
  taxRate:     z.coerce.number().min(0).max(100).optional(),
});

const formSchema = z.object({
  memberId:                   z.string().min(1, 'Member ID required'),
  branchId:                   z.string().min(1, 'Branch ID required'),
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceForm({ open, onOpenChange, defaultMemberId, defaultBranchId }: InvoiceFormProps) {
  const createInvoice = useCreateInvoice({ onSuccess: () => onOpenChange(false) });
  const isPending = createInvoice.isPending;

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
  const lineItems = watch('lineItems');
  const currency = watch('currency');

  // Running totals
  const subtotal = lineItems.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + base;
  }, 0);
  const taxTotal = lineItems.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + base * ((Number(item.taxRate) || 0) / 100);
  }, 0);
  const discountAmt = Number(watch('invoiceLevelDiscountAmount')) || 0;
  const total = subtotal + taxTotal - discountAmt;

  function onSubmit(values: FormValues) {
    createInvoice.mutate({
      memberId:   values.memberId,
      branchId:   values.branchId,
      currency:   values.currency,
      dueDate:    values.dueDate || undefined,
      discountCode: values.discountCode || undefined,
      invoiceLevelDiscountAmount: values.invoiceLevelDiscountAmount,
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
    if (!val) reset();
    onOpenChange(val);
  }

  const LINE_ITEM_TYPES = [
    { value: 'subscription',       label: 'Subscription' },
    { value: 'personal_training',  label: 'Personal Training' },
    { value: 'product',            label: 'Product' },
    { value: 'late_fee',           label: 'Late Fee' },
    { value: 'addon',              label: 'Add-on' },
    { value: 'other',              label: 'Other' },
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

          {/* ── Basic info ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="memberId">Member ID *</Label>
                <Input id="memberId" placeholder="Member ID" disabled={isPending} className={errors.memberId ? 'border-destructive' : ''} {...register('memberId')} />
                {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branchId">Branch ID *</Label>
                <Input id="branchId" placeholder="Branch ID" disabled={isPending} className={errors.branchId ? 'border-destructive' : ''} {...register('branchId')} />
                {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
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
                    {/* Type */}
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={watch(`lineItems.${index}.type`)}
                        onValueChange={(v) => setValue(`lineItems.${index}.type`, v as FormValues['lineItems'][0]['type'])}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINE_ITEM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
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
                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label className="text-xs">Qty *</Label>
                      <Input type="number" min="0.01" step="0.01" className="h-8 text-xs" disabled={isPending} {...register(`lineItems.${index}.quantity`)} />
                    </div>
                    {/* Unit price */}
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price *</Label>
                      <Input type="number" min="0" step="0.01" className="h-8 text-xs" disabled={isPending} {...register(`lineItems.${index}.unitPrice`)} />
                    </div>
                    {/* Tax rate */}
                    <div className="space-y-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input type="number" min="0" max="100" step="0.01" className="h-8 text-xs" placeholder="0" disabled={isPending} {...register(`lineItems.${index}.taxRate`)} />
                    </div>
                  </div>

                  {/* Row total */}
                  <div className="text-right text-xs text-muted-foreground">
                    Line total: <span className="font-medium text-foreground">
                      {formatCurrency(
                        (Number(lineItems[index]?.quantity) || 0) * (Number(lineItems[index]?.unitPrice) || 0) *
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="discountCode">Discount Code</Label>
                <Input id="discountCode" placeholder="e.g. SUMMER25" disabled={isPending} {...register('discountCode')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoiceLevelDiscountAmount">Invoice Discount ({currency})</Label>
                <Input id="invoiceLevelDiscountAmount" type="number" min="0" step="0.01" placeholder="0.00" disabled={isPending} {...register('invoiceLevelDiscountAmount')} />
              </div>
            </div>

            {/* Running total */}
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
              {discountAmt > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountAmt, currency)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
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
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
