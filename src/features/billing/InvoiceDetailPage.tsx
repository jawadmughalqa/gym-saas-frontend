import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, XCircle, Tag, CreditCard, AlignLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, DetailHeaderSkeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate } from '@/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  useGetInvoicesInvoiceId,
  usePostInvoicesInvoiceIdIssue,
  usePostInvoicesInvoiceIdVoid,
  getGetInvoicesInvoiceIdQueryKey,
  getGetInvoicesQueryKey,
} from '@/api/generated/invoices/invoices';
import type { Invoice } from '@/types/billing.types';
import InvoiceSummary from './components/InvoiceDetail/InvoiceSummary';
import LineItemsTable from './components/InvoiceDetail/LineItemsTable';
import PaymentsTab from './components/InvoiceDetail/PaymentsTab';
import InstalmentTab from './components/InvoiceDetail/InstalmentTab';
import ApplyDiscountDialog from './components/InvoiceDetail/ApplyDiscountDialog';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const queryClient = useQueryClient();

  const [discountOpen, setDiscountOpen] = useState(false);
  const { confirm, confirmProps } = useConfirm();

  const { data: response, isLoading } = useGetInvoicesInvoiceId(invoiceId ?? '');
  const invoice = response?.data;

  const issue = usePostInvoicesInvoiceIdIssue({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId ?? '') });
        queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        toast({ title: 'Invoice issued successfully' });
      },
      onError: (err: any) => {
        toast({ variant: 'destructive', title: 'Failed to issue invoice', description: err?.response?.data?.message || err?.message });
      },
    },
  });

  const voidInv = usePostInvoicesInvoiceIdVoid({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId ?? '') });
        queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
        toast({ title: 'Invoice voided successfully' });
      },
      onError: (err: any) => {
        toast({ variant: 'destructive', title: 'Failed to void invoice', description: err?.response?.data?.message || err?.message });
      },
    },
  });

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
          <Button variant="outline" onClick={() => navigate('/billing/invoices')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="-ml-2 mt-0.5" onClick={() => navigate(-1)}>
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
                {invoice.memberId?.firstName} {invoice.memberId?.lastName} · {invoice.memberId?.email}
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
                <Button size="sm" onClick={() => issue.mutate({ invoiceId: invoice._id, data: {} })} disabled={issue.isPending}>
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
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() =>
                    confirm(
                      { title: `Void ${invoice.invoiceNumber}?`, description: 'This will permanently void the invoice.', variant: 'destructive', confirmLabel: 'Void Invoice' },
                      () => voidInv.mutate({ invoiceId: invoice._id, data: { reason: 'Voided by staff' } }),
                    )
                  }
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

      {/* ── Summary + Line Items ──────────────────────────────────────── */}
      <InvoiceSummary invoice={invoice as Invoice} />
      <LineItemsTable items={invoice.lineItems} currency={invoice.currency} />

      {/* ── Memo ─────────────────────────────────────────────────────── */}
      {invoice.memo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Memo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.memo}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── Payments + Instalments tabs ───────────────────────────────── */}
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
          <PaymentsTab invoice={invoice as Invoice} />
        </TabsContent>
        <TabsContent value="instalments" className="mt-4">
          <InstalmentTab invoice={invoice as Invoice} />
        </TabsContent>
      </Tabs>

      <ApplyDiscountDialog invoiceId={invoice._id} open={discountOpen} onOpenChange={setDiscountOpen} />
      <ConfirmDialog {...confirmProps} loading={voidInv.isPending} />
    </PageShell>
  );
}
