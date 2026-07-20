import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, Globe,
  RefreshCw, Ban, CheckCircle, Zap, CreditCard,
  User, Calendar, KeyRound, Copy, Check, Eye, EyeOff,
  MoreHorizontal, Download, Printer, MessageCircle, Pencil, Play, Settings2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { orvalMutator } from '@/lib/orval-mutator';
import { WORLD_COUNTRIES } from '@/config/world-countries';
import { FormDescription } from '@/components/ui/form';
import { decodeJwt } from '@/utils/jwt';
import { downloadSaasInvoicePdf, printSaasInvoicePdf, shareSaasInvoicePdfViaWhatsApp } from '@/utils/invoice-pdf';
import SendWhatsAppMessageDialog from '@/components/shared/SendWhatsAppMessageDialog';
import type { WhatsAppInvoiceData } from '@/utils/whatsapp-message';
import type { JwtPayloadShape } from '@/utils/jwt';
import type { Permission } from '@/lib/permissions';
import {
  useGetSuperTenantsTenantId,
  usePatchSuperTenantsTenantIdStatus,
  usePatchSuperTenantsTenantIdPlan,
  usePatchSuperTenantsTenantId,
  usePostSuperTenantsTenantIdImpersonate,
  useGetSuperTenantsTenantIdInvoices,
  usePostSuperTenantsTenantIdInvoicesInvoiceIdPay,
  usePostSuperTenantsTenantIdResetOwnerPassword,
  getGetSuperTenantsTenantIdQueryKey,
  getGetSuperTenantsQueryKey,
  getGetSuperTenantsTenantIdInvoicesQueryKey,
  getGetSuperDashboardQueryKey,
  getGetSuperPaymentsSummaryQueryKey,
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
    starter:    'text-muted-foreground border-border',
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
        qc.invalidateQueries({ queryKey: getGetSuperDashboardQueryKey() });
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
        qc.invalidateQueries({ queryKey: getGetSuperDashboardQueryKey() });
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
            <Alert className="border-green-500 bg-green-500/10 dark:bg-green-950">
              <AlertDescription className="text-green-500 dark:text-green-300 font-medium">
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

// ─── Edit Tenant Details Dialog ──────────────────────────────────────────────

const editTenantSchema = z.object({
  businessName: z.string().min(2, 'At least 2 characters').max(100),
  contactEmail: z.string().email('Invalid email'),
  contactPhone: z
    .string()
    .refine((v) => !v || v.replace(/\D/g, '').length >= 7, {
      message: 'Phone number must have at least 7 digits',
    })
    .optional(),
  country: z.string().min(2, 'Country is required').max(100),
});
type EditTenantValues = z.infer<typeof editTenantSchema>;

function EditTenantDialog({
  open,
  onOpenChange,
  tenantId,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  defaultValues: EditTenantValues;
}) {
  const qc = useQueryClient();
  const form = useForm<EditTenantValues>({
    resolver: zodResolver(editTenantSchema),
    defaultValues,
  });

  // Load enabled countries from platform config
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['auth', 'countries'],
    queryFn: async () => {
      const { api } = await import('@/lib/axios');
      const res = await api.get('/auth/countries');
      return res.data?.data as { enabledCountries: { name: string; code: string; currencyCode: string; currencySymbol: string }[] };
    },
    staleTime: 10 * 60 * 1000,
  });
  const allCountries = countriesData?.enabledCountries ?? [];

  // Derive currency preview from the currently selected country
  const watchedCountry = form.watch('country');
  const derivedCurrency = (() => {
    const c = WORLD_COUNTRIES.find((w) => w.name === watchedCountry);
    return c ? `${c.currencySymbol} ${c.currencyCode}` : null;
  })();

  // Reset form with latest tenant data every time the dialog opens
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = usePatchSuperTenantsTenantId({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSuperTenantsTenantIdQueryKey(tenantId) });
        qc.invalidateQueries({ queryKey: getGetSuperTenantsQueryKey() });
        toast({ title: 'Tenant details updated' });
        onOpenChange(false);
      },
      onError: (err) => toast({ variant: 'destructive', title: 'Update failed', description: getErrorMessage(err) }),
    },
  });

  function onSubmit(values: EditTenantValues) {
    patch.mutate({
      tenantId,
      data: {
        businessName: values.businessName,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || undefined,
        country: values.country,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(defaultValues); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organisation Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +12125550147"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>Include country code in E.164 format, e.g. +1 for US/Canada</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countriesLoading ? (
                        <SelectItem value="__loading__" disabled>Loading countries…</SelectItem>
                      ) : allCountries.length > 0 ? (
                        allCountries.map((c) => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))
                      ) : (
                        // Fallback to full WORLD_COUNTRIES list if none are enabled yet
                        WORLD_COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {derivedCurrency && (
                    <FormDescription>
                      Default currency: <span className="font-semibold font-mono">{derivedCurrency}</span>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { form.reset(defaultValues); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={patch.isPending}>
                {patch.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Trial Dialog ────────────────────────────────────────────────────────

const editTrialSchema = z
  .object({
    mode: z.enum(['set', 'remove']),
    trialEndsAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'set') {
      if (!data.trialEndsAt) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please pick a date and time', path: ['trialEndsAt'] });
      } else if (new Date(data.trialEndsAt) <= new Date()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Trial end date must be in the future', path: ['trialEndsAt'] });
      }
    }
  });
type EditTrialValues = z.infer<typeof editTrialSchema>;

function EditTrialDialog({
  open,
  onOpenChange,
  tenantId,
  currentTrialEndsAt,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  currentTrialEndsAt?: string | null;
  onSuccess: () => void;
}) {
  const form = useForm<EditTrialValues>({
    resolver: zodResolver(editTrialSchema),
    defaultValues: { mode: 'set', trialEndsAt: '' },
  });

  const mode = form.watch('mode');

  // When switching to 'remove', clear the date field so no stale validation errors remain
  useEffect(() => {
    if (mode === 'remove') {
      form.setValue('trialEndsAt', '');
      form.clearErrors('trialEndsAt');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // datetime-local input expects "YYYY-MM-DDTHH:mm" (local time, no seconds/Z)
  const toDateTimeLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (open) {
      // Pre-fill with current trial end (if future) or blank
      const dateVal =
        currentTrialEndsAt && new Date(currentTrialEndsAt) > new Date()
          ? toDateTimeLocal(currentTrialEndsAt)
          : '';
      form.reset({ mode: 'set', trialEndsAt: dateVal });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: ({ trialEndsAt }: { trialEndsAt: string | null }) =>
      orvalMutator({ url: `/super/tenants/${tenantId}/trial`, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, data: { trialEndsAt } }),
    onSuccess: () => {
      toast({ title: 'Trial updated' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast({ variant: 'destructive', title: 'Failed to update trial', description: err.message }),
  });

  function onSubmit(values: EditTrialValues) {
    if (values.mode === 'remove') {
      mutation.mutate({ trialEndsAt: null });
    } else {
      if (!values.trialEndsAt) { form.setError('trialEndsAt', { message: 'Please pick a date' }); return; }
      mutation.mutate({ trialEndsAt: new Date(values.trialEndsAt).toISOString() });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Trial Period</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="set">Set / extend trial end date</SelectItem>
                      <SelectItem value="remove">Remove trial (activate now)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {mode === 'set' && (
              <FormField
                control={form.control}
                name="trialEndsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial ends on (date &amp; time)</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        min={(() => {
                          const now = new Date();
                          now.setMinutes(now.getMinutes() + 1);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                        })()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === 'remove' && (
              <p className="text-sm text-muted-foreground">
                The tenant's status will change to <strong>active</strong> immediately and the trial end date will be cleared.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── BillingSettingsCard ──────────────────────────────────────────────────────

function BillingSettingsCard({
  tenantId,
  currentAdvanceDays,
}: {
  tenantId: string;
  currentAdvanceDays: number;
}) {
  const [advanceDays, setAdvanceDays] = useState<number>(currentAdvanceDays);
  const [triggerResult, setTriggerResult] = useState<null | {
    invoices: { created: number; skipped: number; errors: number };
    ptInvoices: { created: number; skipped: number; errors: number };
    overdue: { marked: number };
    elapsedMs: number;
  }>(null);

  // Sync if parent data changes (e.g. after refetch)
  useEffect(() => { setAdvanceDays(currentAdvanceDays); }, [currentAdvanceDays]);

  const saveMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await orvalMutator<{ data: { invoiceAdvanceDays: number } }>({
        url: `/super/tenants/${tenantId}/billing-settings`,
        method: 'PATCH',
        data: { invoiceAdvanceDays: days },
      });
      return res;
    },
    onSuccess: (res) => {
      toast({ title: `Invoice advance set to ${res.data.invoiceAdvanceDays} day(s)` });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: getErrorMessage(err) });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const res = await orvalMutator<{ data: typeof triggerResult }>({
        url: `/super/tenants/${tenantId}/billing/trigger`,
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: (data) => {
      setTriggerResult(data);
      toast({ title: 'Billing worker finished' });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: getErrorMessage(err) });
    },
  });

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Billing Worker Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advance days */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-muted-foreground mb-1">
              Generate invoices <span className="font-medium text-foreground">N days before</span> the due date
            </p>
            <p className="text-[11px] text-muted-foreground">
              0 = same day as due date. Max 30. Members receive the invoice this many days early.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={30}
              value={advanceDays}
              onChange={(e) => setAdvanceDays(Math.max(0, Math.min(30, Number(e.target.value))))}
              className="w-20 text-center"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(advanceDays)}
            >
              {saveMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Manual trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Run Billing Worker Now</p>
            <p className="text-xs text-muted-foreground">
              Immediately generates due invoices, marks overdue, and sends alerts for this tenant.
            </p>
          </div>
          <Button
            size="sm"
            disabled={triggerMutation.isPending}
            onClick={() => triggerMutation.mutate()}
          >
            {triggerMutation.isPending
              ? <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Running...</>
              : <><Play className="mr-1.5 h-3.5 w-3.5" /> Run Worker</>
            }
          </Button>
        </div>

        {/* Results */}
        {triggerResult && (
          <Alert>
            <AlertDescription>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Invoices Created</p>
                  <p className="font-semibold text-green-600">{triggerResult.invoices.created}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                  <p className="font-semibold">{triggerResult.invoices.skipped}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Marked Overdue</p>
                  <p className="font-semibold text-amber-600">{triggerResult.overdue.marked}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Elapsed</p>
                  <p className="font-semibold">{triggerResult.elapsedMs}ms</p>
                </div>
              </div>
              {triggerResult.invoices.errors > 0 && (
                <p className="mt-2 text-xs text-destructive">{triggerResult.invoices.errors} error(s) — check server logs</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
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
  const [editOpen, setEditOpen] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [saasWaDialog, setSaasWaDialog] = useState<{ data: WhatsAppInvoiceData; phone?: string } | null>(null);

  const enterImpersonation = useAuthStore((s) => s.enterImpersonation);

  const { confirm, confirmProps } = useConfirm();

  const { data: tenantData, isLoading } = useGetSuperTenantsTenantId(
    tenantId!,
    { query: { staleTime: 1000 * 30 } },
  );

  const { data: statsData } = useQuery({
    queryKey: ['super', 'tenants', tenantId, 'stats'],
    queryFn: () => orvalMutator<{
      members: { total: number; active: number };
      trainers: { total: number; active: number };
      staff: { total: number };
      branches: { total: number };
      revenue: { total: number; currency: string };
      overdueInvoices: number;
      refunds: { total: number; count: number; currency: string };
      checkInsThisMonth: number;
    }>({ url: `/super/tenants/${tenantId}/stats`, method: 'GET' }),
    enabled: !!tenantId,
    staleTime: 1000 * 60,
  });
  const stats = (statsData as unknown as { data: typeof statsData })?.data ?? statsData;

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
        void qc.invalidateQueries({ queryKey: getGetSuperDashboardQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetSuperPaymentsSummaryQueryKey() });
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

  function saasRowToPdfData(row: SaasInvoice) {
    return {
      invoiceNumber: row.invoiceNumber ?? 'INV',
      status: row.status ?? 'unknown',
      recipientName: tenant?.businessName ?? '',
      currency: row.currency ?? 'USD',
      total: row.amount ?? 0,
      amountDue: row.amount ?? 0,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      lineLabel: 'SaaS Subscription',
      tenantPlan: tenant?.plan,
      senderName: 'Gymanger Platform',
    };
  }

  function handleSaasInvoicePrint(row: SaasInvoice) {
    printSaasInvoicePdf(saasRowToPdfData(row));
  }

  function handleSaasInvoiceDownload(row: SaasInvoice) {
    downloadSaasInvoicePdf(saasRowToPdfData(row));
  }

  async function handleSaasInvoiceWhatsApp(row: SaasInvoice) {
    const phone = tenant?.contactPhone;
    if (!phone) {
      toast({ variant: 'destructive', title: 'No phone number', description: 'This tenant has no contact phone on file.' });
      return;
    }
    try {
      const result = await shareSaasInvoicePdfViaWhatsApp(saasRowToPdfData(row), phone);
      if (result === 'downloaded') {
        toast({ title: 'PDF downloaded', description: 'WhatsApp is opening — attach the PDF to the tenant\'s chat.' });
      }
    } catch {
      // user cancelled native share — no action needed
    }
  }

  function handleSaasInvoiceWhatsAppMessage(row: SaasInvoice) {
    const phone = tenant?.contactPhone;
    if (!phone) {
      toast({ variant: 'destructive', title: 'No phone number', description: 'This tenant has no contact phone on file.' });
      return;
    }
    setSaasWaDialog({
      data: {
        invoiceNumber: row.invoiceNumber ?? 'INV',
        status: row.status ?? 'issued',
        memberName: tenant?.businessName ?? '',
        senderName: 'Gymanger Platform',
        currency: row.currency ?? 'USD',
        total: row.amount ?? 0,
        amountDue: row.amount ?? 0,
        dueDate: row.dueDate,
      },
      phone,
    });
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
      cell: (row) => row.dueDate ? (
        <div className="flex flex-col">
          <span className="text-sm">{new Date(row.dueDate).toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">{new Date(row.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: '_id',
      header: '',
      width: 'w-10',
      cell: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleSaasInvoiceDownload(row)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSaasInvoicePrint(row)}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSaasInvoiceWhatsApp(row)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Send via WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSaasInvoiceWhatsAppMessage(row)}>
                <MessageCircle className="mr-2 h-4 w-4 text-green-500" />
                Send WhatsApp Message
              </DropdownMenuItem>
              {row.status !== 'paid' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={markInvoicePaid.isPending}
                    onClick={() => markInvoicePaid.mutate({ tenantId: tenantId!, invoiceId: row._id!, data: {} })}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Mark Paid
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
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


      {/* ── Stats overview ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Members */}
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="text-2xl font-bold mt-1">{stats.members?.active ?? 0}</p>
            <p className="text-xs text-muted-foreground">of {stats.members?.total ?? 0} total</p>
          </Card>
          {/* Trainers */}
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Trainers</p>
            <p className="text-2xl font-bold mt-1">{stats.trainers?.active ?? 0}</p>
            <p className="text-xs text-muted-foreground">of {stats.trainers?.total ?? 0} total</p>
          </Card>
          {/* Branches */}
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Branches</p>
            <p className="text-2xl font-bold mt-1">{stats.branches?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Staff: {stats.staff?.total ?? 0}</p>
          </Card>
          {/* Check-ins */}
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Check-ins (this month)</p>
            <p className="text-2xl font-bold mt-1">{stats.checkInsThisMonth ?? 0}</p>
            <p className="text-xs text-muted-foreground">Overdue invoices: {stats.overdueInvoices ?? 0}</p>
          </Card>
          {/* Revenue */}
          <Card className="p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Total Revenue Collected</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: stats.revenue?.currency || 'USD' }).format(stats.revenue?.total ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">From all paid invoices</p>
          </Card>
          {/* Refunds */}
          <Card className="p-4 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Total Refunded</p>
            <p className="text-2xl font-bold mt-1 text-destructive">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: stats.refunds?.currency || 'USD' }).format(stats.refunds?.total ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{stats.refunds?.count ?? 0} approved refund{stats.refunds?.count !== 1 ? 's' : ''}</p>
          </Card>
        </div>
      )}

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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Organisation
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="mr-1.5 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow icon={Globe}    label="Country"         value={tenant.country} />
                <InfoRow icon={Mail}     label="Contact Email"   value={tenant.contactEmail} />
                <InfoRow icon={Phone}    label="Contact Phone"   value={tenant.contactPhone} />
                <InfoRow icon={Calendar} label="Created"         value={tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : undefined} />
                {/* Trial Ends row with Manage button */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Trial Ends</p>
                      <p className="text-sm font-medium">
                        {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : <span className="text-muted-foreground font-normal">No trial</span>}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTrialOpen(true)}>
                    Manage
                  </Button>
                </div>
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
                    {/* Password row — always visible to super admin */}
                    <div className="flex items-center gap-2 py-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-20 shrink-0">Password</span>
                      {owner.tempPasswordPlain ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-mono text-sm select-all truncate">
                            {passwordVisible ? owner.tempPasswordPlain : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPasswordVisible((v) => !v)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            title={passwordVisible ? 'Hide password' : 'Show password'}
                          >
                            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          {!owner.forcePasswordChange && (
                            <span className="text-[10px] text-muted-foreground italic shrink-0">(owner set)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Use Reset Password to generate
                        </span>
                      )}
                    </div>
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

            {/* Billing Settings card */}
            <BillingSettingsCard tenantId={tenantId!} currentAdvanceDays={(tenant as any)?.settings?.invoiceAdvanceDays ?? 0} />
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

      <EditTenantDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tenantId={tenantId!}
        defaultValues={{
          businessName: tenant.businessName ?? '',
          contactEmail: tenant.contactEmail ?? '',
          contactPhone: tenant.contactPhone ?? '',
          country: tenant.country ?? '',
        }}
      />

      <EditTrialDialog
        open={trialOpen}
        onOpenChange={setTrialOpen}
        tenantId={tenantId!}
        currentTrialEndsAt={tenant.trialEndsAt}
        onSuccess={() => qc.invalidateQueries({ queryKey: getGetSuperTenantsTenantIdQueryKey(tenantId!) })}
      />

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

      {saasWaDialog && (
        <SendWhatsAppMessageDialog
          open={!!saasWaDialog}
          onOpenChange={(open) => { if (!open) setSaasWaDialog(null); }}
          data={saasWaDialog.data}
          phone={saasWaDialog.phone}
        />
      )}
    </PageShell>
  );
}
