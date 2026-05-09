import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, XCircle, Tag, CreditCard, AlignLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardSkeleton, DetailHeaderSkeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import { InvoiceStatusBadge, PaymentStatusBadge, InstalmentPlanStatusBadge } from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format';
import {
  useInvoice,
  useIssueInvoice, useVoidInvoice, useApplyDiscount,
  useRecordPayment, useRefundPayment,
  useCreateInstalmentPlan, useRecordInstalmentPayment, useCancelInstalmentPlan,
  useInstalmentPlan,
} from './hooks/use-billing';
import type { Invoice, Payment, InvoiceLineItem, InstalmentScheduleEntry } from '@/types/billing.types';

// ─── Summary card ─────────────────────────────────────────────────────────────

function InvoiceSummary({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Subtotal</p>
          <p className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</p>
        </div>
        {invoice.discountTotal > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Discount</p>
            <p className="font-medium text-green-600">-{formatCurrency(invoice.discountTotal, invoice.currency)}</p>
          </div>
        )}
        {invoice.taxTotal > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tax</p>
            <p className="font-medium">{formatCurrency(invoice.taxTotal, invoice.currency)}</p>
          </div>
        )}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-lg font-bold">{formatCurrency(invoice.total, invoice.currency)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid</p>
          <p className="font-medium text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount Due</p>
          <p className={`font-bold ${invoice.amountDue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {formatCurrency(invoice.amountDue, invoice.currency)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Line items table ─────────────────────────────────────────────────────────

function LineItemsTable({ items, currency }: { items: InvoiceLineItem[]; currency: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Line Items
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Unit Price</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Tax</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p>{item.description}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.taxRate ? `${item.taxRate}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(item.total ?? item.unitPrice * item.quantity, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Payments tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ invoice }: { invoice: Invoice }) {
  const { can } = usePermission();
  const [payFormOpen, setPayFormOpen] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const { confirm, confirmProps } = useConfirm();
  const refund = useRefundPayment(refundingId ?? '');

  // We get payments from the invoice's amountPaid — for full list we need a separate query
  // but for now show what we know + record payment button
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {formatCurrency(invoice.amountPaid, invoice.currency)} paid of {formatCurrency(invoice.total, invoice.currency)}
        </p>
        {can('payment.create') && ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && (
          <Button size="sm" onClick={() => setPayFormOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}
      </div>

      {invoice.amountPaid === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No payments recorded"
          description="Record the first payment against this invoice."
          action={can('payment.create') && ['issued', 'partially_paid', 'overdue'].includes(invoice.status)
            ? { label: 'Record Payment', onClick: () => setPayFormOpen(true) }
            : undefined}
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Total paid: <span className="font-semibold text-foreground">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              View full payment history in the Payments section.
            </p>
          </CardContent>
        </Card>
      )}

      <RecordPaymentDialog
        invoiceId={invoice._id}
        currency={invoice.currency}
        amountDue={invoice.amountDue}
        open={payFormOpen}
        onOpenChange={setPayFormOpen}
      />
      <ConfirmDialog {...confirmProps} loading={refund.isPending} />
    </div>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

const paySchema = z.object({
  amount:    z.coerce.number().positive('Amount must be positive'),
  method:    z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']),
  reference: z.string().optional(),
  notes:     z.string().optional(),
});
type PayFormValues = z.infer<typeof paySchema>;

function RecordPaymentDialog({
  invoiceId, currency, amountDue, open, onOpenChange,
}: { invoiceId: string; currency: string; amountDue: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const recordPayment = useRecordPayment({ onSuccess: () => onOpenChange(false) });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: amountDue, method: 'cash' },
  });

  function onSubmit(values: PayFormValues) {
    recordPayment.mutate({
      invoiceId,
      amount: values.amount,
      method: values.method,
      reference: values.reference || undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Amount ({currency}) *</Label>
            <Input type="number" step="0.01" min="0.01" disabled={recordPayment.isPending} {...register('amount')} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(amountDue, currency)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Method *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={recordPayment.isPending}
              {...register('method')}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference / Transaction ID</Label>
            <Input placeholder="Optional" disabled={recordPayment.isPending} {...register('reference')} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional" disabled={recordPayment.isPending} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={recordPayment.isPending}>Cancel</Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Instalment Tab ───────────────────────────────────────────────────────────

function InstalmentTab({ invoice }: { invoice: Invoice }) {
  const { can } = usePermission();
  const [createOpen, setCreateOpen] = useState(false);
  const plan = useInstalmentPlan(invoice.instalmentPlanId ?? '');
  const cancelPlan = useCancelInstalmentPlan(invoice.instalmentPlanId ?? '');
  const { confirm, confirmProps } = useConfirm();

  const entryStatusColor: Record<InstalmentScheduleEntry['status'], string> = {
    pending: 'text-muted-foreground',
    paid:    'text-green-600',
    overdue: 'text-destructive',
    waived:  'text-muted-foreground line-through',
  };

  if (!invoice.instalmentPlanId) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<AlignLeft className="h-10 w-10" />}
          title="No instalment plan"
          description="Set up a payment schedule for this invoice."
          action={can('instalment.create') && ['issued', 'partially_paid'].includes(invoice.status)
            ? { label: 'Create Plan', onClick: () => setCreateOpen(true) }
            : undefined}
        />
        <CreateInstalmentDialog invoiceId={invoice._id} open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  if (plan.isLoading) return <CardSkeleton />;
  if (!plan.data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InstalmentPlanStatusBadge status={plan.data.status} />
          <span className="text-sm text-muted-foreground">
            {plan.data.numberOfInstalments} instalments · {formatCurrency(plan.data.instalmentAmount, plan.data.currency)} each
          </span>
        </div>
        {can('instalment.update') && plan.data.status === 'active' && (
          <Button
            variant="ghost" size="sm" className="text-destructive hover:text-destructive"
            onClick={() => confirm(
              { title: 'Cancel instalment plan?', description: 'The invoice will remain active. This cannot be undone.', variant: 'destructive', confirmLabel: 'Cancel Plan' },
              () => cancelPlan.mutate('Cancelled by staff'),
            )}
          >
            Cancel Plan
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {plan.data.schedule.map((entry) => (
                  <tr key={entry._id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{entry.instalmentNumber}</td>
                    <td className="px-4 py-3">{formatDate(entry.dueDate)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entryStatusColor[entry.status]}`}>
                      {formatCurrency(entry.amount, plan.data!.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={entry.status === 'paid' ? 'success' : entry.status === 'overdue' ? 'destructive' : 'outline'}>
                        {entry.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog {...confirmProps} loading={cancelPlan.isPending} />
    </div>
  );
}

// ─── Create Instalment Dialog ─────────────────────────────────────────────────

const instalmentSchema = z.object({
  numberOfInstalments: z.coerce.number().int().min(2).max(60),
  frequencyDays:       z.coerce.number().int().min(1),
  downPayment:         z.coerce.number().min(0).optional(),
  startDate:           z.string().optional(),
});
type InstalmentFormValues = z.infer<typeof instalmentSchema>;

function CreateInstalmentDialog({
  invoiceId, open, onOpenChange,
}: { invoiceId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateInstalmentPlan({ onSuccess: () => onOpenChange(false) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InstalmentFormValues>({
    resolver: zodResolver(instalmentSchema),
    defaultValues: { numberOfInstalments: 3, frequencyDays: 30, downPayment: 0 },
  });

  function onSubmit(values: InstalmentFormValues) {
    create.mutate({
      invoiceId,
      numberOfInstalments: values.numberOfInstalments,
      frequencyDays: values.frequencyDays,
      downPayment: values.downPayment,
      startDate: values.startDate || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Create Instalment Plan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Number of Instalments *</Label>
              <Input type="number" min={2} max={60} disabled={create.isPending} {...register('numberOfInstalments')} />
              {errors.numberOfInstalments && <p className="text-xs text-destructive">{errors.numberOfInstalments.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Frequency (days) *</Label>
              <Input type="number" min={1} disabled={create.isPending} {...register('frequencyDays')} />
              {errors.frequencyDays && <p className="text-xs text-destructive">{errors.frequencyDays.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Down Payment</Label>
            <Input type="number" step="0.01" min={0} placeholder="0.00" disabled={create.isPending} {...register('downPayment')} />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" disabled={create.isPending} {...register('startDate')} />
            <p className="text-xs text-muted-foreground">Defaults to today.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Apply Discount Dialog ────────────────────────────────────────────────────

const discountSchema = z.object({ discountCode: z.string().min(1, 'Code is required') });
type DiscountFormValues = z.infer<typeof discountSchema>;

function ApplyDiscountDialog({
  invoiceId, open, onOpenChange,
}: { invoiceId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const apply = useApplyDiscount(invoiceId, { onSuccess: () => onOpenChange(false) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
  });

  function onSubmit(values: DiscountFormValues) {
    apply.mutate({ discountCode: values.discountCode });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Apply Discount Code</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Discount Code *</Label>
            <Input placeholder="e.g. SUMMER25" disabled={apply.isPending} {...register('discountCode')} />
            {errors.discountCode && <p className="text-xs text-destructive">{errors.discountCode.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={apply.isPending}>Cancel</Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── InvoiceDetailPage ────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();

  const [discountOpen, setDiscountOpen] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const { data: invoice, isLoading } = useInvoice(invoiceId ?? '');
  const issue = useIssueInvoice(invoiceId ?? '');
  const voidInv = useVoidInvoice(invoiceId ?? '');

  if (isLoading) {
    return (
      <PageShell>
        <DetailHeaderSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (!invoice) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Invoice not found</h2>
          <Button variant="outline" onClick={() => navigate('/billing')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="-ml-2 mt-0.5" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-mono">{invoice.invoiceNumber}</h1>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {invoice.memberId.firstName} {invoice.memberId.lastName} · {invoice.memberId.email}
              </p>
              {invoice.dueDate && (
                <p className={`text-sm mt-0.5 ${invoice.status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  Due {formatDate(invoice.dueDate)}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {can('invoice.create') && invoice.status === 'draft' && (
                <Button size="sm" onClick={() => issue.mutate({})} disabled={issue.isPending}>
                  {issue.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Issue Invoice
                </Button>
              )}
              {can('discount.apply') && ['draft', 'issued'].includes(invoice.status) && (
                <Button size="sm" variant="outline" onClick={() => setDiscountOpen(true)}>
                  <Tag className="mr-2 h-4 w-4" />
                  Apply Discount
                </Button>
              )}
              {can('invoice.void') && ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && (
                <Button
                  size="sm" variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => confirm(
                    { title: `Void ${invoice.invoiceNumber}?`, description: 'This will permanently void the invoice.', variant: 'destructive', confirmLabel: 'Void Invoice' },
                    () => voidInv.mutate({ reason: 'Voided by staff' }),
                  )}
                  disabled={voidInv.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Void
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <InvoiceSummary invoice={invoice} />

      {/* Line items */}
      <LineItemsTable items={invoice.lineItems} currency={invoice.currency} />

      {/* Memo */}
      {invoice.memo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Memo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.memo}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Payments + Instalments tabs */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="instalments" className="flex items-center gap-1.5">
            <AlignLeft className="h-4 w-4" />
            <span>Instalment Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTab invoice={invoice} />
        </TabsContent>

        <TabsContent value="instalments" className="mt-4">
          <InstalmentTab invoice={invoice} />
        </TabsContent>
      </Tabs>

      <ApplyDiscountDialog invoiceId={invoice._id} open={discountOpen} onOpenChange={setDiscountOpen} />
      <ConfirmDialog {...confirmProps} loading={voidInv.isPending} />
    </PageShell>
  );
}
