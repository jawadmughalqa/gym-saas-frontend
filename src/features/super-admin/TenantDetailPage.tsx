import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, Globe,
  RefreshCw, Ban, CheckCircle, Zap, CreditCard,
  User, Calendar, KeyRound, Copy, Check, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { decodeJwt } from '@/utils/jwt';
import type { JwtPayloadShape } from '@/utils/jwt';
import type { Permission } from '@/lib/permissions';
import {
  useGetSuperTenantsTenantId,
  usePatchSuperTenantsTenantIdStatus,
  usePatchSuperTenantsTenantIdPlan,
  usePostSuperTenantsTenantIdImpersonate,
  useGetSuperTenantsTenantIdInvoices,
  usePostSuperTenantsTenantIdInvoicesInvoiceIdPay,
  usePostSuperTenantsTenantIdResetOwnerPassword,
  getGetSuperTenantsTenantIdQueryKey,
  getGetSuperTenantsQueryKey,
  getGetSuperTenantsTenantIdInvoicesQueryKey,
} from '@/api/generated/super-admin/super-admin';
import type { ResetOwnerPasswordResponseData } from '@/api/generated/schemas/resetOwnerPasswordResponse';
import type { Tenant } from '@/api/generated/schemas/tenant';
import type { SaasInvoice } from '@/api/generated/schemas/saasInvoice';
import type { ChangeTenantStatusRequestStatus } from '@/api/generated/schemas/changeTenantStatusRequestStatus';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TenantStatusBadge({ status }: { status?: string }) {
  if (status === 'active')     return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
  if (status === 'trial')      return <Badge className="bg-blue-600 hover:bg-blue-700">Trial</Badge>;
  if (status === 'suspended')  return <Badge variant="destructive">Suspended</Badge>;
  if (status === 'terminated') return <Badge variant="destructive">Terminated</Badge>;
  return <Badge variant="outline">{status ?? '—'}</Badge>;
}

function PlanBadge({ plan }: { plan?: string }) {
  const cls: Record<string, string> = {
    starter:    'text-slate-600 border-slate-300',
    pro:        'text-purple-600 border-purple-300',
    enterprise: 'text-amber-600 border-amber-300',
  };
  return (
    <Badge variant="outline" className={`capitalize ${cls[plan ?? ''] ?? ''}`}>
      {plan ?? '—'}
    </Badge>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{String(value)}</p>
      </div>
    </div>
  );
}

// ─── Change Status Dialog ─────────────────────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'terminated']),
  reason: z.string().min(1, 'Reason is required').max(500),
});
type StatusForm = z.infer<typeof statusSchema>;

function ChangeStatusDialog({
  open,
  onOpenChange,
  tenantId,
  currentStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  currentStatus?: string;
}) {
  const qc = useQueryClient();
  const form = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: 'suspended', reason: '' },
  });

  const patch = usePatchSuperTenantsTenantIdStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSuperTenantsTenantIdQueryKey(tenantId) });
        qc.invalidateQueries({ queryKey: getGetSuperTenantsQueryKey() });
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to update status', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: StatusForm) {
    patch.mutate({ tenantId, data: { status: values.status as ChangeTenantStatusRequestStatus, reason: values.reason } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Tenant Status</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {currentStatus !== 'active'     && <SelectItem value="active">Active</SelectItem>}
                      {currentStatus !== 'suspended'  && <SelectItem value="suspended">Suspended</SelectItem>}
                      {currentStatus !== 'terminated' && <SelectItem value="terminated">Terminated</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain the reason for this change…" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={patch.isPending}>
                {patch.isPending ? 'Updating…' : 'Update Status'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Plan Dialog ───────────────────────────────────────────────────────

const planSchema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
  reason: z.string().max(500).optional(),
});
type PlanForm = z.infer<typeof planSchema>;

function ChangePlanDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
}) {
  const qc = useQueryClient();
  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { plan: 'pro', reason: '' },
  });

  const patch = usePatchSuperTenantsTenantIdPlan({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSuperTenantsTenantIdQueryKey(tenantId) });
        qc.invalidateQueries({ queryKey: getGetSuperTenantsQueryKey() });
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to change plan', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: PlanForm) {
    patch.mutate({ tenantId, data: { plan: values.plan, ...(values.reason && { reason: values.reason }) } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Plan</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Note why the plan is changing…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={patch.isPending}>
                {patch.isPending ? 'Updating…' : 'Change Plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CopyField (reused from CreateTenantForm) ─────────────────────────────────

function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const displayed = secret && !revealed ? '••••••••••••' : value;

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      <div className="flex items-center gap-2 rounded bg-muted px-3 py-2 font-mono text-sm">
        {secret ? (
          <button type="button" onClick={() => setRevealed((r) => !r)} className="text-muted-foreground hover:text-foreground shrink-0">
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : (
          <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 select-all truncate">{displayed}</span>
        <button type="button" onClick={handleCopy} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────

function ResetPasswordDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
}) {
  const [result, setResult] = useState<ResetOwnerPasswordResponseData | null>(null);

  const reset = usePostSuperTenantsTenantIdResetOwnerPassword({
    mutation: {
      onSuccess: (res) => {
        setResult(res.data ?? null);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to reset password', description: getErrorMessage(err) }),
    },
  });

  function handleClose(v: boolean) {
    if (!v) setResult(null);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Owner Password</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
                ✓ Password reset successfully!
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border p-4 space-y-3">
              <CopyField label="Owner Email" value={result.ownerEmail} />
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">New Temporary Password</p>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  One-time — copy now
                </Badge>
              </div>
              <CopyField label="" value={result.tempPassword} secret />
              <p className="text-xs text-muted-foreground">
                The owner must change this password on next login.
              </p>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will generate a new temporary password for the gym owner. They will be required to change it on their next login.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={reset.isPending}
                onClick={() => reset.mutate({ tenantId })}
              >
                {reset.isPending ? 'Resetting…' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── TenantDetailPage ─────────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusOpen, setStatusOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);

  const enterImpersonation = useAuthStore((s) => s.enterImpersonation);

  const { confirm, confirmProps } = useConfirm();

  const { data: tenantData, isLoading } = useGetSuperTenantsTenantId(
    tenantId!,
    { query: { staleTime: 1000 * 30 } },
  );

  const { data: invoicesData, isLoading: invoicesLoading } = useGetSuperTenantsTenantIdInvoices(
    tenantId!,
    { page: invoicesPage, limit: 20 },
    { query: { staleTime: 1000 * 30 } },
  );

  const impersonate = usePostSuperTenantsTenantIdImpersonate({
    mutation: {
      onSuccess: (res) => {
        const token = res.data?.accessToken;
        if (!token) return;

        // Decode the JWT to build the impersonated user object for the store
        const payload = decodeJwt<JwtPayloadShape>(token);
        if (!payload) return;

        enterImpersonation(token, {
          userId: payload.userId,
          tenantId: payload.tenantId ?? null,
          role: payload.role as import('@/types/api.types').UserRole,
          email: payload.email ?? '',
          name: tenant?.businessName ?? payload.email ?? 'Gym Owner',
          permissions: (payload.permissions ?? []) as Permission[],
        });

        // Wipe super-admin query cache so tenant pages load fresh data
        qc.clear();
        navigate('/dashboard', { replace: true });
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Impersonation failed', description: getErrorMessage(err) }),
    },
  });

  const markInvoicePaid = usePostSuperTenantsTenantIdInvoicesInvoiceIdPay({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetSuperTenantsTenantIdInvoicesQueryKey(tenantId!) });
        toast({ title: 'Invoice marked as paid' });
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Failed to mark invoice paid', description: getErrorMessage(err) }),
    },
  });

  const tenant = tenantData?.data;
  const owner = tenantData?.data?.owner;
  const invoices = invoicesData?.data ?? [];
  const invoicesPagination = invoicesData?.pagination;

  function handleImpersonate() {
    confirm(
      {
        title: 'Impersonate tenant owner?',
        description: 'A short-lived token (1h) will be generated. You will act as the gym owner.',
        confirmLabel: 'Impersonate',
      },
      () => impersonate.mutate({ tenantId: tenantId! }),
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </PageShell>
    );
  }

  if (!tenant) {
    return (
      <PageShell>
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="Tenant not found"
          description="This tenant may have been removed."
          action={{ label: 'Back', onClick: () => navigate('/super-admin') }}
        />
      </PageShell>
    );
  }

  const invoiceColumns: ColumnDef<SaasInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      cell: (row) => <span className="font-mono text-sm">{row.invoiceNumber || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span className="tabular-nums">
          {row.currency} {(row.amount ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const s = row.status ?? '';
        const cls = s === 'paid' ? 'bg-green-600 hover:bg-green-700' : '';
        const variant = s === 'overdue' ? 'destructive' as const : 'default' as const;
        return <Badge variant={variant} className={cls}>{s}</Badge>;
      },
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      cell: (row) => row.dueDate ? <span className="text-sm text-muted-foreground">{new Date(row.dueDate).toLocaleDateString()}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: '_id',
      header: '',
      cell: (row) =>
        row.status !== 'paid' ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={markInvoicePaid.isPending}
            onClick={(e) => {
              e.stopPropagation();
              markInvoicePaid.mutate({ tenantId: tenantId!, invoiceId: row._id!, data: {} });
            }}
          >
            Mark Paid
          </Button>
        ) : null,
    },
  ];

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 shrink-0" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{tenant.businessName}</h1>
              <TenantStatusBadge status={tenant.status} />
              <PlanBadge plan={tenant.plan} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{tenant.contactEmail}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Change Plan
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)}>
            {tenant.status === 'active' ? (
              <Ban className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            )}
            Change Status
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleImpersonate}
            disabled={impersonate.isPending}
          >
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Impersonate
          </Button>
        </div>
      </div>


      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {invoicesPagination?.total !== undefined && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{invoicesPagination.total}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organisation card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Organisation
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow icon={Globe}    label="Country"         value={tenant.country} />
                <InfoRow icon={Mail}     label="Contact Email"   value={tenant.contactEmail} />
                <InfoRow icon={Phone}    label="Contact Phone"   value={tenant.contactPhone} />
                <InfoRow icon={Calendar} label="Created"         value={tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : undefined} />
                <InfoRow icon={Calendar} label="Trial Ends"      value={tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : undefined} />
                <InfoRow icon={CreditCard} label="Billing Day"   value={tenant.billingCycleDay} />
              </CardContent>
            </Card>

            {/* Owner card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> Owner
                  </CardTitle>
                  {owner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setResetPasswordOpen(true)}
                    >
                      <KeyRound className="mr-1.5 h-3 w-3" />
                      Reset Password
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {owner ? (
                  <>
                    <InfoRow icon={User}     label="Name"       value={`${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || undefined} />
                    <InfoRow icon={Mail}     label="Email"      value={owner.email} />
                    <InfoRow icon={Calendar} label="Last Login" value={owner.lastLoginAt ? new Date(owner.lastLoginAt).toLocaleDateString() : 'Never'} />
                    {/* Status + forcePasswordChange badges */}
                    <div className="flex items-center gap-2 py-2 flex-wrap">
                      {owner.status && (
                        owner.status === 'active'
                          ? <Badge className="bg-green-600 hover:bg-green-700 text-xs">Active</Badge>
                          : owner.status === 'suspended'
                            ? <Badge variant="destructive" className="text-xs">Suspended</Badge>
                            : <Badge variant="outline" className="text-xs capitalize">{owner.status}</Badge>
                      )}
                      {owner.forcePasswordChange && (
                        <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                          Must change password
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">No owner data available</p>
                )}
              </CardContent>
            </Card>

            {/* Quotas card */}
            {tenant.quotas && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Plan Quotas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Max Branches', val: tenant.quotas.maxBranches },
                      { label: 'Max Members',  val: tenant.quotas.maxMembers },
                      { label: 'Max Trainers', val: tenant.quotas.maxTrainers },
                      { label: 'Storage (MB)', val: tenant.quotas.maxStorageMb },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-semibold">{val === -1 ? '∞' : (val ?? '—')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature flags card */}
            {tenant.featureFlags && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Feature Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tenant.featureFlags).map(([flag, enabled]) => (
                      <Badge
                        key={flag}
                        variant={enabled ? 'default' : 'outline'}
                        className={enabled ? 'bg-green-600 hover:bg-green-700 text-xs' : 'text-muted-foreground text-xs'}
                      >
                        {flag.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Invoices tab ── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          <Separator />
          {!invoicesLoading && invoices.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title="No invoices"
              description="This tenant has no billing invoices yet."
            />
          ) : (
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              keyExtractor={(row) => row._id ?? ''}
              loading={invoicesLoading}
            />
          )}
          {invoicesPagination && invoices.length > 0 && (
            <Pagination meta={invoicesPagination} onPageChange={setInvoicesPage} />
          )}
        </TabsContent>
      </Tabs>

      <ChangeStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        tenantId={tenantId!}
        currentStatus={tenant.status}
      />

      <ChangePlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        tenantId={tenantId!}
      />

      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        tenantId={tenantId!}
      />

      <ConfirmDialog {...confirmProps} loading={impersonate.isPending} />
    </PageShell>
  );
}
