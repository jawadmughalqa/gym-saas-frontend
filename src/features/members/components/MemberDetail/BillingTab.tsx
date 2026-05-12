/**
 * BillingTab
 *
 * Shown inside MemberDetailPage > Billing tab.
 * Renders the member's outstanding invoices inline with per-invoice
 * payment collection, payment history, and a "New Invoice" shortcut.
 */

import { useState } from 'react';
import { FilePlus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetInvoices } from '@/api/generated/invoices/invoices';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { OutstandingFeesList } from '@/features/billing/components/OutstandingFeesList';
import { CollectPaymentForm } from '@/features/billing/components/CollectPaymentForm';
import { PaymentHistoryList } from '@/features/billing/components/PaymentHistoryList';
import { StatusBadge } from '@/features/billing/components/StatusBadge';
import InvoiceForm from '@/features/billing/components/InvoiceForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutstandingInvoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  currency: string;
  dueDate?: string;
  lineItems?: { description?: string }[];
}

interface BillingTabProps {
  memberId: string;
  branchId: string;
  memberName: string;
}

// ─── BillingTab ───────────────────────────────────────────────────────────────

export function BillingTab({ memberId, branchId, memberName }: BillingTabProps) {
  const navigate = useNavigate();
  const { can } = usePermission();

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  // ── Fetch invoices for this member ─────────────────────────────────────────
  const { data: invoicesData, isLoading, refetch } = useGetInvoices(
    { memberId, limit: 50 },
    { query: { staleTime: 5000 } },
  );

  const allInvoices = (invoicesData as any)?.data ?? [];

  const outstandingInvoices: OutstandingInvoice[] = allInvoices.filter(
    (inv: OutstandingInvoice) =>
      inv.status === 'issued' ||
      inv.status === 'partially_paid' ||
      inv.status === 'overdue',
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.amountDue || 0),
    0,
  );

  const activeInvoice = outstandingInvoices.find((inv) => inv._id === activeInvoiceId) ?? null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCollect(invoiceId: string) {
    setActiveInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  }

  function handlePaymentSuccess() {
    setActiveInvoiceId(null);
    refetch();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ── Header actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Invoices and payment history for {memberName}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => navigate(`/billing/invoices?memberId=${memberId}`)}
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            All Invoices
          </Button>
          {can('invoice.create') && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setNewInvoiceOpen(true)}
            >
              <FilePlus className="h-3.5 w-3.5 mr-1.5" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* ── Total outstanding ─────────────────────────────────────────── */}
          <div
            className={cn(
              'rounded-lg p-4 border',
              totalOutstanding > 0
                ? 'bg-red-50 border-red-100'
                : 'bg-emerald-50 border-emerald-100',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
            <p
              className={cn(
                'text-2xl font-bold',
                totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600',
              )}
            >
              {formatCurrency(totalOutstanding, 'PKR')}
            </p>
            {outstandingInvoices.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Across {outstandingInvoices.length} unpaid invoice
                {outstandingInvoices.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* ── Outstanding invoices ──────────────────────────────────────── */}
          <OutstandingFeesList
            invoices={outstandingInvoices}
            activeInvoiceId={activeInvoiceId}
            onCollect={can('payment.create') ? handleCollect : undefined}
          />

          {/* ── Inline payment form ───────────────────────────────────────── */}
          {activeInvoice && (
            <>
              <Separator />
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Collecting payment for
                    </p>
                    <p className="text-sm font-mono font-medium mt-0.5">
                      {activeInvoice.invoiceNumber}
                    </p>
                  </div>
                  <StatusBadge status={activeInvoice.status} />
                </div>
                <CollectPaymentForm
                  invoiceId={activeInvoice._id}
                  amountDue={activeInvoice.amountDue}
                  currency={activeInvoice.currency || 'PKR'}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            </>
          )}

          <Separator />

          {/* ── Payment history ───────────────────────────────────────────── */}
          <PaymentHistoryList memberId={memberId} />
        </>
      )}

      {/* New Invoice form — pre-fills member + branch */}
      <InvoiceForm
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        defaultMemberId={memberId}
        defaultBranchId={branchId}
      />
    </div>
  );
}
