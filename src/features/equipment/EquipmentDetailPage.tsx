import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Wrench, AlertTriangle, Calendar, DollarSign,
  MapPin, Tag, ClipboardList, PlusCircle, CheckCircle2, XCircle, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { EquipmentStatusBadge } from '@/components/shared/StatusBadge';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import {
  useGetEquipmentEquipmentId,
  useGetEquipmentEquipmentIdMaintenance,
  usePostEquipmentEquipmentIdMaintenance,
  useDeleteEquipmentEquipmentId,
  getGetEquipmentEquipmentIdQueryKey,
  getGetEquipmentEquipmentIdMaintenanceQueryKey,
  getGetEquipmentQueryKey,
} from '@/api/generated/equipment/equipment';
import { useGetBranchesBranchId } from '@/api/generated/branches/branches';
import {
  useGetWorkOrders,
  usePostWorkOrders,
  usePostWorkOrdersWorkOrderIdResolve,
  usePostWorkOrdersWorkOrderIdCancel,
  getGetWorkOrdersQueryKey,
} from '@/api/generated/work-orders/work-orders';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from '@/api/generated/notifications/notifications';
import type { MaintenanceLog } from '@/api/generated/schemas/maintenanceLog';
import type { WorkOrder } from '@/api/generated/schemas/workOrder';
import EquipmentForm from './components/EquipmentForm';

// ─── Maintenance log form schema ──────────────────────────────────────────────

const maintenanceSchema = z.object({
  type: z.enum(['routine', 'repair', 'inspection', 'calibration', 'cleaning', 'part_replace']),
  performedAt: z.string().min(1, 'Required'),
  performedBy: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  cost: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(0).optional()),
  conditionBefore: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  conditionAfter: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  nextMaintenanceDue: z.string().optional(),
  updateEquipmentStatus: z.enum(['operational', 'under_maintenance', 'out_of_service', 'retired']).optional(),
});

type MaintenanceFormValues = z.input<typeof maintenanceSchema>;

// ─── Work order form schema ───────────────────────────────────────────────────

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().min(1, 'Description is required').max(2000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  estimatedCost: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(0).optional()),
  dueAt: z.string().optional(),
});

type WorkOrderFormValues = z.input<typeof workOrderSchema>;

// ─── Resolve work order schema ────────────────────────────────────────────────

const resolveSchema = z.object({
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
  actualCost: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(0).optional()),
});

type ResolveFormValues = z.input<typeof resolveSchema>;

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_VARIANT = {
  low: 'secondary',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
} as const;

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const variant = PRIORITY_VARIANT[priority as keyof typeof PRIORITY_VARIANT] ?? 'secondary';
  return (
    <Badge variant={variant as 'secondary' | 'warning' | 'destructive'} className="capitalize">
      {priority}
    </Badge>
  );
}

const WO_STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  open: 'warning',
  in_progress: 'warning',
  pending_parts: 'secondary',
  resolved: 'success',
  cancelled: 'destructive',
};
const WO_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_parts: 'Pending Parts',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

// ─── LogMaintenanceDialog ─────────────────────────────────────────────────────

function LogMaintenanceDialog({
  open, onOpenChange, equipmentId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipmentId: string;
  onSuccess: () => void;
}) {
  const logMaintenance = usePostEquipmentEquipmentIdMaintenance({
    mutation: {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess();
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to log maintenance', description: getErrorMessage(err) }),
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      type: 'routine',
      performedAt: new Date().toISOString().slice(0, 10),
    },
  });

  function onSubmit(values: MaintenanceFormValues) {
    logMaintenance.mutate({
      equipmentId,
      data: {
        type: values.type as 'routine' | 'repair' | 'inspection' | 'calibration' | 'cleaning' | 'part_replace',
        performedAt: values.performedAt,
        performedBy: values.performedBy || undefined,
        vendor: values.vendor || undefined,
        description: values.description,
        cost: values.cost as number | undefined,
        conditionBefore: values.conditionBefore as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
        conditionAfter: values.conditionAfter as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
        nextMaintenanceDue: values.nextMaintenanceDue || undefined,
        updateEquipmentStatus: values.updateEquipmentStatus as 'operational' | 'under_maintenance' | 'out_of_service' | 'retired' | undefined,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Maintenance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v as MaintenanceFormValues['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['routine', 'repair', 'inspection', 'calibration', 'cleaning', 'part_replace'].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="performedAt">Performed At <span className="text-destructive">*</span></Label>
              <DatePicker
                id="performedAt"
                value={watch('performedAt') ?? ''}
                onChange={(v) => setValue('performedAt', v ?? '')}
              />
              {errors.performedAt && <p className="text-xs text-destructive">{errors.performedAt.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" rows={3} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="performedBy">Performed By</Label>
              <Input id="performedBy" placeholder="Technician name" {...register('performedBy')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" placeholder="Service company" {...register('vendor')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Condition Before</Label>
              <Select value={watch('conditionBefore') ?? ''} onValueChange={(v) => setValue('conditionBefore', v as MaintenanceFormValues['conditionBefore'])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['excellent', 'good', 'fair', 'poor'].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condition After</Label>
              <Select value={watch('conditionAfter') ?? ''} onValueChange={(v) => setValue('conditionAfter', v as MaintenanceFormValues['conditionAfter'])}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['excellent', 'good', 'fair', 'poor'].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" min={0} step="1" placeholder="0.00" {...register('cost')} />
              {errors.cost && <p className="text-xs text-destructive">{errors.cost.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextMaintenanceDue">Next Due Date</Label>
              <DatePicker
                id="nextMaintenanceDue"
                value={watch('nextMaintenanceDue') ?? ''}
                onChange={(v) => setValue('nextMaintenanceDue', v ?? '')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Update Equipment Status</Label>
            <Select value={watch('updateEquipmentStatus') ?? ''} onValueChange={(v) => setValue('updateEquipmentStatus', v as MaintenanceFormValues['updateEquipmentStatus'])}>
              <SelectTrigger><SelectValue placeholder="Keep current status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={logMaintenance.isPending}>
              {logMaintenance.isPending ? 'Saving…' : 'Log Maintenance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreateWorkOrderDialog ────────────────────────────────────────────────────

function CreateWorkOrderDialog({
  open, onOpenChange, equipmentId, branchId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipmentId: string;
  branchId: string;
  onSuccess: () => void;
}) {
  const qcWO = useQueryClient();
  const createWO = usePostWorkOrders({
    mutation: {
      onSuccess: () => {
        void qcWO.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        void qcWO.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
        onOpenChange(false);
        onSuccess();
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to create work order', description: getErrorMessage(err) }),
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { priority: 'medium' },
  });

  function onSubmit(values: WorkOrderFormValues) {
    createWO.mutate({
      data: {
        equipmentId,
        branchId,
        title: values.title,
        description: values.description,
        priority: values.priority as 'low' | 'medium' | 'high' | 'critical' | undefined,
        estimatedCost: values.estimatedCost as number | undefined,
        dueAt: values.dueAt || undefined,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="wo-title">Title <span className="text-destructive">*</span></Label>
            <Input id="wo-title" placeholder="Brief issue title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wo-desc">Description <span className="text-destructive">*</span></Label>
            <Textarea id="wo-desc" rows={3} placeholder="Describe the issue in detail" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={watch('priority') ?? 'medium'} onValueChange={(v) => setValue('priority', v as WorkOrderFormValues['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-due">Due Date</Label>
              <DatePicker
                id="wo-due"
                value={watch('dueAt') ?? ''}
                onChange={(v) => setValue('dueAt', v ?? '')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wo-cost">Estimated Cost</Label>
            <Input id="wo-cost" type="number" min={0} step="1" placeholder="0.00" {...register('estimatedCost')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createWO.isPending}>
              {createWO.isPending ? 'Creating…' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ResolveWorkOrderDialog ───────────────────────────────────────────────────

function ResolveWorkOrderDialog({
  open, onOpenChange, workOrderId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workOrderId: string;
  onSuccess: () => void;
}) {
  const resolve = usePostWorkOrdersWorkOrderIdResolve({
    mutation: {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess();
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to resolve work order', description: getErrorMessage(err) }),
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResolveFormValues>({
    resolver: zodResolver(resolveSchema),
  });

  function onSubmit(values: ResolveFormValues) {
    resolve.mutate({
      workOrderId,
      data: {
        resolutionNotes: values.resolutionNotes,
        actualCost: values.actualCost as number | undefined,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Work Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="resolution">Resolution Notes <span className="text-destructive">*</span></Label>
            <Textarea id="resolution" rows={4} placeholder="Describe how the issue was resolved…" {...register('resolutionNotes')} />
            {errors.resolutionNotes && <p className="text-xs text-destructive">{errors.resolutionNotes.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actual-cost">Actual Cost</Label>
            <Input id="actual-cost" type="number" min={0} step="1" placeholder="0.00" {...register('actualCost')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={resolve.isPending}>
              {resolve.isPending ? 'Resolving…' : 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── EquipmentDetailPage ──────────────────────────────────────────────────────

export default function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [logMaintenanceOpen, setLogMaintenanceOpen] = useState(false);
  const [createWOOpen, setCreateWOOpen] = useState(false);
  const [resolvingWO, setResolvingWO] = useState<string | null>(null);

  // ── Shared invalidation helper ──────────────────────────────────────────────
  function invalidateEquipmentDetail() {
    void qc.invalidateQueries({ queryKey: getGetEquipmentEquipmentIdQueryKey(equipmentId ?? '') });
    void qc.invalidateQueries({ queryKey: getGetEquipmentEquipmentIdMaintenanceQueryKey(equipmentId ?? '') });
    void qc.invalidateQueries({ queryKey: getGetWorkOrdersQueryKey({ equipmentId: equipmentId ?? '' }) });
    // Also invalidate the list so status/condition changes show there too
    void qc.invalidateQueries({ queryKey: getGetEquipmentQueryKey() });
  }

  const { confirm, confirmProps } = useConfirm();
  const cancelWO = usePostWorkOrdersWorkOrderIdCancel({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetWorkOrdersQueryKey({ equipmentId: equipmentId ?? '' }) });
        toast({ title: 'Work order cancelled' });
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to cancel work order', description: getErrorMessage(err) }),
    },
  });

  const { data: equipment, isLoading } = useGetEquipmentEquipmentId(equipmentId ?? '');
  const { data: maintenanceLogs } = useGetEquipmentEquipmentIdMaintenance(equipmentId ?? '', {});
  const { data: workOrdersData } = useGetWorkOrders({ equipmentId: equipmentId ?? '' });

  const eq = equipment?.data;
  // Treat equipment's stored currency as the tenant currency; fall back to USD
  const currency = eq?.currency || 'USD';

  // Look up branch name from branchId
  const { data: branchData } = useGetBranchesBranchId(
    (eq as any)?.branchId ?? '',
    { query: { enabled: !!(eq as any)?.branchId, staleTime: 1000 * 60 * 5 } },
  );
  const branchName = (branchData?.data as any)?.name ?? null;
  const logs: MaintenanceLog[] = maintenanceLogs?.data ?? [];
  const workOrders: WorkOrder[] = workOrdersData?.data ?? [];

  if (isLoading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      </PageShell>
    );
  }

  if (!eq) {
    return (
      <PageShell>
        <p className="text-muted-foreground">Equipment not found.</p>
      </PageShell>
    );
  }

  const isOverdue = eq.nextMaintenanceDue && new Date(eq.nextMaintenanceDue) < new Date();

  return (
    <PageShell>
      <PageHeader
        title={eq.name ?? 'Equipment Detail'}
        subtitle={[eq.brand, eq.modelName].filter(Boolean).join(' · ') || eq.category}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/equipment')}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            {can('equipment.update') && (
              <Button size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="maintenance">
            Maintenance
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{logs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workorders">
            Work Orders
            {workOrders.filter((w) => w.status !== 'resolved' && w.status !== 'cancelled').length > 0 && (
              <Badge variant="warning" className="ml-2 h-5 px-1.5 text-xs">
                {workOrders.filter((w) => w.status !== 'resolved' && w.status !== 'cancelled').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="mt-4 space-y-4">
          {isOverdue && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Maintenance overdue since {new Date(eq.nextMaintenanceDue!).toLocaleDateString()}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status + Condition */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <EquipmentStatusBadge status={eq.status as 'operational' | 'under_maintenance' | 'out_of_service' | 'retired'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Condition</span>
                  <Badge variant="outline" className="capitalize">{eq.condition ?? '—'}</Badge>
                </div>
              </div>
            </div>

            {/* Identity */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium capitalize">{eq.category ?? '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Serial No.</span>
                  <span className="font-medium font-mono">{eq.serialNumber ?? '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Asset Tag</span>
                  <span className="font-medium">{eq.assetTag ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* Location + Maintenance */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Location & Schedule</h3>
              <div className="space-y-2 text-sm">
                {branchName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{branchName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{eq.location ?? 'No location set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {eq.nextMaintenanceDue
                      ? new Date(eq.nextMaintenanceDue).toLocaleDateString()
                      : 'No schedule'}
                  </span>
                </div>
                {eq.maintenanceIntervalDays && (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Every {eq.maintenanceIntervalDays} days</span>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase info */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Purchase Date</span>
                  <span className="font-medium">
                    {eq.purchaseDate ? new Date(eq.purchaseDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span className="font-medium">
                    {eq.purchasePrice != null
                      ? `${currency} ${eq.purchasePrice.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{eq.vendor ?? '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">Warranty Expires</span>
                  <span className="font-medium">
                    {eq.warrantyExpiresAt ? new Date(eq.warrantyExpiresAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {eq.notes && (
              <div className="rounded-lg border p-4 space-y-2 sm:col-span-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
                <p className="text-sm">{eq.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Maintenance tab ── */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Maintenance History ({logs.length})</h3>
            {can('equipment.update') && (
              <Button size="sm" onClick={() => setLogMaintenanceOpen(true)}>
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Log Maintenance
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No maintenance records yet.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log._id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {log.type?.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium">
                        {log.performedAt ? new Date(log.performedAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {log.cost != null && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        {currency} {log.cost.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <p className="text-sm">{log.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {log.performedBy && <span>By: {log.performedBy}</span>}
                    {log.vendor && <span>Vendor: {log.vendor}</span>}
                    {log.conditionBefore && log.conditionAfter && (
                      <span className="capitalize">{log.conditionBefore} → {log.conditionAfter}</span>
                    )}
                    {log.nextMaintenanceDue && (
                      <span>Next due: {new Date(log.nextMaintenanceDue).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Work Orders tab ── */}
        <TabsContent value="workorders" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Work Orders ({workOrders.length})</h3>
            {can('equipment.update') && (
              <Button size="sm" onClick={() => setCreateWOOpen(true)}>
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Create Work Order
              </Button>
            )}
          </div>

          {workOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No work orders for this equipment.
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <div key={wo._id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{wo.title}</span>
                        <PriorityBadge priority={wo.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground">{wo.description}</p>
                    </div>
                    <Badge variant={WO_STATUS_VARIANT[wo.status ?? ''] ?? 'secondary'}>
                      {WO_STATUS_LABEL[wo.status ?? ''] ?? wo.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Created {wo.createdAt ? new Date(wo.createdAt).toLocaleDateString() : '—'}</span>
                    {wo.dueAt && <span>Due {new Date(wo.dueAt).toLocaleDateString()}</span>}
                    {wo.estimatedCost != null && <span>Est. {currency} {wo.estimatedCost.toLocaleString()}</span>}
                    {wo.actualCost != null && <span>Actual {currency} {wo.actualCost.toLocaleString()}</span>}
                  </div>

                  {wo.resolutionNotes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2">
                      Resolution: {wo.resolutionNotes}
                    </p>
                  )}

                  {wo.status !== 'resolved' && wo.status !== 'cancelled' && can('equipment.update') && (
                    <div className="flex gap-2 pt-1 border-t">
                      <Button
                        size="sm" variant="outline"
                        className="text-success border-success/40 hover:bg-success/10"
                        onClick={() => setResolvingWO(wo._id ?? '')}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Resolve
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          confirm(
                            { title: 'Cancel work order?', description: 'This cannot be undone.', variant: 'destructive', confirmLabel: 'Cancel WO' },
                            () => cancelWO.mutate({ workOrderId: wo._id ?? '', data: { reason: 'Cancelled by staff' } }),
                          )
                        }
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms / Dialogs */}
      <EquipmentForm open={editOpen} onOpenChange={setEditOpen} equipment={eq} />

      <LogMaintenanceDialog
        open={logMaintenanceOpen}
        onOpenChange={setLogMaintenanceOpen}
        equipmentId={equipmentId ?? ''}
        onSuccess={invalidateEquipmentDetail}
      />

      <CreateWorkOrderDialog
        open={createWOOpen}
        onOpenChange={setCreateWOOpen}
        equipmentId={equipmentId ?? ''}
        branchId={eq.branchId ?? ''}
        onSuccess={invalidateEquipmentDetail}
      />

      {resolvingWO && (
        <ResolveWorkOrderDialog
          open={!!resolvingWO}
          onOpenChange={(v) => { if (!v) setResolvingWO(null); }}
          workOrderId={resolvingWO}
          onSuccess={invalidateEquipmentDetail}
        />
      )}

      <ConfirmDialog {...confirmProps} loading={cancelWO.isPending} />
    </PageShell>
  );
}
