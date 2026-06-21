import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetBranches } from '@/api/generated/branches/branches';
import {
  usePostEquipment,
  usePatchEquipmentEquipmentId,
  getGetEquipmentQueryKey,
  getGetEquipmentEquipmentIdQueryKey,
} from '@/api/generated/equipment/equipment';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from '@/api/generated/notifications/notifications';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import type { Equipment } from '@/api/generated/schemas/equipment';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'cardio', 'strength', 'free weights', 'functional', 'flexibility',
  'group fitness', 'recovery', 'other',
];

// CURRENCIES imported from tenant.config — PKR is the default

// ─── Schema ───────────────────────────────────────────────────────────────────

const optionalNumber = (min = 0) =>
  z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(min).optional());

const equipmentSchema = z.object({
  // create-only
  branchId: z.string().optional(),

  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().optional(),
  modelName: z.string().optional(),
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: optionalNumber(0),
  currency: z.string().optional(),
  warrantyExpiresAt: z.string().optional(),
  vendor: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  status: z.enum(['operational', 'under_maintenance', 'out_of_service', 'retired']).optional(),
  maintenanceIntervalDays: optionalNumber(1),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type EquipmentFormValues = z.input<typeof equipmentSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipmentForm({ open, onOpenChange, equipment }: EquipmentFormProps) {
  const isEdit = !!equipment;
  const qc = useQueryClient();
  const { currency } = useTenantCurrency();

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const createEquipment = usePostEquipment({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetEquipmentQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        toast({ title: 'Equipment added' });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to add equipment', description: getErrorMessage(err) }),
    },
  });

  const updateEquipment = usePatchEquipmentEquipmentId({
    mutation: {
      onSuccess: (_data, variables) => {
        void qc.invalidateQueries({ queryKey: getGetEquipmentQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetEquipmentEquipmentIdQueryKey(variables.equipmentId) });
        toast({ title: 'Equipment updated' });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to update equipment', description: getErrorMessage(err) }),
    },
  });

  const isPending = createEquipment.isPending || updateEquipment.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      category: 'cardio',
      condition: 'good',
      currency: currency,
      status: 'operational',
    },
  });

  useEffect(() => {
    if (open && equipment) {
      reset({
        name: equipment.name ?? '',
        category: equipment.category ?? 'cardio',
        brand: equipment.brand ?? '',
        modelName: equipment.modelName ?? '',
        serialNumber: equipment.serialNumber ?? '',
        assetTag: equipment.assetTag ?? '',
        purchaseDate: equipment.purchaseDate?.slice(0, 10) ?? '',
        purchasePrice: equipment.purchasePrice != null ? String(equipment.purchasePrice) : '',
        currency: equipment.currency ?? currency,
        warrantyExpiresAt: equipment.warrantyExpiresAt?.slice(0, 10) ?? '',
        vendor: equipment.vendor ?? '',
        condition: (equipment.condition as EquipmentFormValues['condition']) ?? 'good',
        status: (equipment.status as EquipmentFormValues['status']) ?? 'operational',
        maintenanceIntervalDays: equipment.maintenanceIntervalDays != null ? String(equipment.maintenanceIntervalDays) : '',
        location: equipment.location ?? '',
        notes: equipment.notes ?? '',
      });
    } else if (open && !equipment) {
      reset({
        category: 'cardio',
        condition: 'good',
        currency: currency,
        status: 'operational',
      });
    }
  }, [open, equipment, reset]);

  function onSubmit(values: EquipmentFormValues) {
    const payload = {
      name: values.name,
      category: values.category,
      brand: values.brand || undefined,
      modelName: values.modelName || undefined,
      serialNumber: values.serialNumber || undefined,
      assetTag: values.assetTag || undefined,
      purchaseDate: values.purchaseDate || undefined,
      purchasePrice: values.purchasePrice as number | undefined,
      currency: values.currency || undefined,
      warrantyExpiresAt: values.warrantyExpiresAt || undefined,
      vendor: values.vendor || undefined,
      condition: values.condition,
      maintenanceIntervalDays: values.maintenanceIntervalDays as number | undefined,
      location: values.location || undefined,
      notes: values.notes || undefined,
    };

    if (isEdit) {
      updateEquipment.mutate({
        equipmentId: equipment._id ?? '',
        data: {
          ...payload,
          status: values.status,
        },
      });
    } else {
      createEquipment.mutate({
        data: {
          branchId: values.branchId ?? '',
          ...payload,
        },
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{isEdit ? 'Edit Equipment' : 'Add Equipment'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update equipment details and maintenance schedule.' : 'Register new gym equipment.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">
        <form id="equipment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Branch — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Branch <span className="text-destructive">*</span></Label>
              <Select
                value={watch('branchId') ?? ''}
                onValueChange={(v) => setValue('branchId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id ?? ''}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eq-name">Name <span className="text-destructive">*</span></Label>
              <Input id="eq-name" placeholder="Treadmill T500" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={watch('category') ?? 'cardio'} onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" placeholder="Life Fitness" {...register('brand')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelName">Model</Label>
              <Input id="modelName" placeholder="T5" {...register('modelName')} />
            </div>
          </div>

          {/* Serial + Asset Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" placeholder="SN-000123" {...register('serialNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assetTag">Asset Tag</Label>
              <Input id="assetTag" placeholder="GYM-001" {...register('assetTag')} />
            </div>
          </div>

          {/* Condition + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select
                value={watch('condition') ?? 'good'}
                onValueChange={(v) => setValue('condition', v as EquipmentFormValues['condition'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['excellent', 'good', 'fair', 'poor'].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={watch('status') ?? 'operational'}
                  onValueChange={(v) => setValue('status', v as EquipmentFormValues['status'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Purchase Date + Price + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input id="purchasePrice" type="number" min={0} step="1" placeholder="0.00" {...register('purchasePrice')} />
              {errors.purchasePrice && <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('currency') ?? currency}
                onValueChange={(v) => setValue('currency', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warranty + Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="warrantyExpiresAt">Warranty Expires</Label>
              <Input id="warrantyExpiresAt" type="date" {...register('warrantyExpiresAt')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" placeholder="Supplier name" {...register('vendor')} />
            </div>
          </div>

          {/* Maintenance interval + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="maintenanceIntervalDays">Maintenance Interval (days)</Label>
              <Input id="maintenanceIntervalDays" type="number" min={1} placeholder="90" {...register('maintenanceIntervalDays')} />
              {errors.maintenanceIntervalDays && (
                <p className="text-xs text-destructive">{errors.maintenanceIntervalDays.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Floor 2 - Cardio Zone" {...register('location')} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="eq-notes">Notes</Label>
            <Textarea id="eq-notes" rows={2} placeholder="Any additional notes…" {...register('notes')} />
          </div>

        </form>
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="equipment-form" className="flex-1" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Equipment'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
