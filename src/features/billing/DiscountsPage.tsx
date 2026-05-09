import { useState } from 'react';
import { Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatCurrency } from '@/utils/format';
import { useDiscounts, useCreateDiscount } from './hooks/use-billing';
import DiscountToggleButton from './components/DiscountToggleButton';
import type { Discount, CreateDiscountDto } from '@/types/billing.types';

// ─── Create Discount Form ─────────────────────────────────────────────────────

const createSchema = z.object({
  code:              z.string().min(1, 'Code is required').max(50),
  description:       z.string().max(200).optional(),
  discountType:      z.enum(['percentage', 'fixed_amount']),
  value:             z.coerce.number().positive('Must be positive'),
  scope:             z.enum(['invoice', 'line_item', 'both']).default('invoice'),
  minInvoiceAmount:  z.coerce.number().min(0).optional(),
  maxUsageCount:     z.coerce.number().int().positive().optional(),
  maxUsagePerMember: z.coerce.number().int().positive().optional(),
  validFrom:         z.string().optional(),
  validUntil:        z.string().optional(),
  isActive:          z.boolean().default(true),
});
type CreateFormValues = z.infer<typeof createSchema>;

function DiscountForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createDiscount = useCreateDiscount({ onSuccess: () => onOpenChange(false) });
  const isPending = createDiscount.isPending;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { discountType: 'percentage', scope: 'invoice', isActive: true },
  });

  function onSubmit(values: CreateFormValues) {
    const dto: CreateDiscountDto = {
      code:              values.code.toUpperCase(),
      description:       values.description || undefined,
      discountType:      values.discountType,
      value:             values.value,
      scope:             values.scope,
      minInvoiceAmount:  values.minInvoiceAmount,
      maxUsageCount:     values.maxUsageCount,
      maxUsagePerMember: values.maxUsagePerMember,
      validFrom:         values.validFrom || undefined,
      validUntil:        values.validUntil || undefined,
      isActive:          values.isActive,
    };
    createDiscount.mutate(dto);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const discountType = watch('discountType');

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">Create Discount Code</h2>
          <p className="text-sm text-muted-foreground">Configure a new discount for invoices.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code *</Label>
            <Input id="code" placeholder="SUMMER25" disabled={isPending} className={`uppercase ${errors.code ? 'border-destructive' : ''}`} {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="discountDesc">Description</Label>
            <Textarea id="discountDesc" placeholder="Optional internal description…" disabled={isPending} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={watch('discountType')} onValueChange={(v) => setValue('discountType', v as 'percentage' | 'fixed_amount')} disabled={isPending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Value * {discountType === 'percentage' ? '(%)' : '($)'}</Label>
              <Input id="value" type="number" min="0" step="0.01" disabled={isPending} className={errors.value ? 'border-destructive' : ''} {...register('value')} />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Applies To</Label>
            <Select value={watch('scope')} onValueChange={(v) => setValue('scope', v as 'invoice' | 'line_item' | 'both')} disabled={isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input id="minInvoiceAmount" type="number" min="0" step="0.01" placeholder="No minimum" disabled={isPending} {...register('minInvoiceAmount')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxUsageCount">Max Total Uses</Label>
              <Input id="maxUsageCount" type="number" min="1" placeholder="Unlimited" disabled={isPending} {...register('maxUsageCount')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxUsagePerMember">Max Uses Per Member</Label>
            <Input id="maxUsagePerMember" type="number" min="1" placeholder="Unlimited" disabled={isPending} {...register('maxUsagePerMember')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input id="validFrom" type="date" disabled={isPending} {...register('validFrom')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input id="validUntil" type="date" disabled={isPending} {...register('validUntil')} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive codes cannot be applied to invoices.</p>
            </div>
            <Switch checked={watch('isActive')} onCheckedChange={(v) => setValue('isActive', v)} disabled={isPending} />
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => handleClose(false)} disabled={isPending}>Cancel</Button>
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

// ─── DiscountsPage ────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const { can } = usePermission();
  const { data: discounts, isLoading } = useDiscounts();
  const [formOpen, setFormOpen] = useState(false);

  const columns: ColumnDef<Discount>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (row) => (
        <div>
          <p className="font-mono font-semibold tracking-wide">{row.code}</p>
          {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'discountType',
      header: 'Value',
      cell: (row) => (
        <span className="font-medium">
          {row.discountType === 'percentage'
            ? `${row.value}%`
            : formatCurrency(row.value, 'USD')}
        </span>
      ),
    },
    {
      key: 'usageCount',
      header: 'Usage',
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.usageCount}{row.maxUsageCount ? ` / ${row.maxUsageCount}` : ''}
        </span>
      ),
    },
    {
      key: 'validUntil',
      header: 'Expires',
      hideOnMobile: true,
      cell: (row) => row.validUntil
        ? <span className={new Date(row.validUntil) < new Date() ? 'text-destructive' : ''}>{formatDate(row.validUntil)}</span>
        : <span className="text-muted-foreground">Never</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-28',
      cell: (row) => can('discount.update')
        ? <DiscountToggleButton discount={row} />
        : null,
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Discount Codes"
        subtitle="Manage promotional codes and discount policies"
        actions={
          can('discount.create') && (
            <Button onClick={() => setFormOpen(true)}>
              <Tag className="mr-2 h-4 w-4" />
              New Discount
            </Button>
          )
        }
      />

      {!isLoading && (!discounts || discounts.length === 0) ? (
        <EmptyState
          icon={<Tag className="h-12 w-12" />}
          title="No discount codes"
          description="Create your first discount code to offer to members."
          action={can('discount.create') ? { label: 'New Discount', onClick: () => setFormOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={discounts ?? []}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <DiscountForm open={formOpen} onOpenChange={setFormOpen} />
    </PageShell>
  );
}
