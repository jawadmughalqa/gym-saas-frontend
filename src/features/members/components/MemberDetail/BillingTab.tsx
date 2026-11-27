/**
 * BillingTab
 *
 * Shown inside MemberDetailPage > Billing tab.
 * Renders the member's outstanding invoices with:
 *  - Per-invoice line-item breakdown
 *  - Single-invoice payment via CollectPaymentForm
 *  - Multi-select checkboxes + "Pay Selected" via MultiInvoicePaymentDialog
 *  - Payment history timeline
 *  - "New Invoice" shortcut
 */

import { useState } from 'react';
import { FilePlus, ExternalLink, Banknote, Landmark, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useGetInvoices, getGetInvoicesQueryKey, usePostInvoicesInvoiceIdVoid } from '@/api/generated/invoices/invoices';
import { getGetPaymentsQueryKey } from '@/api/generated/payments/payments';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import type { WalletPayout } from '@/types/member.types';
import { formatDate } from '@/utils/format';
import { usePermission } from '@/hooks/use-permission';
import { OutstandingFeesList, type OutstandingInvoice } from '@/features/billing/components/OutstandingFeesList';
import { CollectPaymentForm } from '@/features/billing/components/CollectPaymentForm';
import { PaymentHistoryList } from '@/features/billing/components/PaymentHistoryList';
import { StatusBadge } from '@/features/billing/components/StatusBadge';
import { MultiInvoicePaymentDialog } from '@/features/billing/components/MultiInvoicePaymentDialog';
import InvoiceForm from '@/features/billing/components/InvoiceForm';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';

// ─── BillingTabProps ──────────────────────────────────────────────────────────

interface BillingTabProps {
  memberId: string;
  branchId: string;
  memberName: string;
}

// ─── BillingTab ───────────────────────────────────────────────────────────────

export function BillingTab({ memberId, branchId, memberName }: BillingTabProps) {
  const navigate = useNavigate();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const { currency: tenantCurrency } = useTenantCurrency();

  // Single-invoice collect
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiPayOpen, setMultiPayOpen] = useState(false);

  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  // Void state
  const [voidInvoiceId, setVoidInvoiceId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const voidMutation = usePostInvoicesInvoiceIdVoid();

  // ── Fetch wallet payouts ───────────────────────────────────────────────────
  const { data: payoutsData, refetch: refetchPayouts } = useQuery<WalletPayout[]>({
    queryKey: ['wallet-payouts', memberId],
    queryFn:  async () => {
      const res = await api.get<{ data: WalletPayout[] }>(`/members/${memberId}/wallet/payouts`);
      return res.data.data;
    },
    staleTime: 30_000,
  });
  const walletPayouts = payoutsData ?? [];

  // ── Fetch wallet transaction ledger ───────────────────────────────────────
  const { data: walletTxnData } = useQuery({
    queryKey: ['wallet-transactions', memberId],
    queryFn:  async () => {
      const res = await api.get<{ data: any[]; total: number }>(`/members/${memberId}/wallet/transactions`, { params: { limit: 20 } });
      return res.data;
    },
    staleTime: 30_000,
  });
  const walletTransactions: any[] = (walletTxnData as any)?.data ?? [];

  // ── Fetch invoices for this member ─────────────────────────────────────────
  const { data: invoicesData, isLoading, refetch } = useGetInvoices(
    { memberId, limit: 100 },
    { query: { staleTime: 5000 } },
  );

  const allInvoices = (invoicesData as any)?.data ?? [];

  const outstandingInvoices: OutstandingInvoice[] = allInvoices
    .filter(
      (inv: any) =>
        inv.status === 'issued' ||
        inv.status === 'partially_paid' ||
        inv.status === 'overdue',
    )
    .map((inv: any) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      amountDue: inv.amountDue ?? 0,
      amountPaid: inv.amountPaid ?? 0,
      total: inv.total ?? 0,
      subtotal: inv.subtotal ?? undefined,
      discountTotal: inv.discountTotal ?? 0,
      currency: inv.currency ?? tenantCurrency,
      dueDate: inv.dueDate,
      lineItems: (inv.lineItems ?? []).map((li: any) => ({
        description: li.description ?? '',
        quantity: li.quantity ?? 1,
        unitPrice: li.unitPrice ?? 0,
        subtotal: li.subtotal ?? undefined,
        discountAmount: li.discountAmount ?? 0,
        total: li.total ?? 0,
        type: li.type ?? 'other',
      })),
    }));

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.amountDue || 0),
    0,
  );

  const activeInvoice = outstandingInvoices.find((inv) => inv._id === activeInvoiceId) ?? null;

  // Selected invoices (for multi-pay dialog)
  const selectedInvoices = outstandingInvoices.filter((inv) => selectedIds.has(inv._id));
  const currency = outstandingInvoices[0]?.currency ?? tenantCurrency;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCollect(invoiceId: string) {
    // Single-collect: toggle panel; clear multi-select
    setSelectedIds(new Set());
    setActiveInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  }

  function handleToggleSelect(invoiceId: string) {
    // Multi-select: toggle; close single-collect panel
    setActiveInvoiceId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

  function handlePaySelected(_ids: string[]) {
    setMultiPayOpen(true);
  }

  function handlePaymentSuccess() {
    setActiveInvoiceId(null);
    setSelectedIds(new Set());
    // Invalidate all billing-related queries so the UI auto-refreshes
    queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey({ memberId }) });
    queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey({ memberId }) });
    // Also invalidate any expanded per-invoice payment timelines
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    refetch();
    void refetchPayouts();
  }

  function handleVoidClick(invoiceId: string) {
    setVoidInvoiceId(invoiceId);
    setVoidReason('');
  }

  async function handleVoidConfirm() {
    if (!voidInvoiceId || !voidReason.trim()) return;
    try {
      await voidMutation.mutateAsync({
        invoiceId: voidInvoiceId,
        data: { reason: voidReason.trim() },
      });
      setVoidInvoiceId(null);
      setVoidReason('');
      queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey({ memberId }) });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      refetch();
    } catch (err) {
      // Error toast handled by mutation
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ── Header actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Invoices and payment history for {memberName}
        </p>
        <div className="flex items-center gap-2 shrink-0">
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
                ? 'bg-red-500/10 border-red-100'
                : 'bg-emerald-500/10 border-emerald-100',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Total Outstanding</p>
            <p
              className={cn(
                'text-2xl font-bold',
                totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600',
              )}
            >
              {formatCurrency(totalOutstanding, currency)}
            </p>
            {outstandingInvoices.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Across {outstandingInvoices.length} unpaid invoice
                {outstandingInvoices.length !== 1 ? 's' : ''}
                {outstandingInvoices.length > 1 && (
                  <span className="ml-1 text-primary cursor-pointer hover:underline" onClick={() => {
                    // Select all on click
                    if (selectedIds.size === outstandingInvoices.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(outstandingInvoices.map((i) => i._id)));
                    }
                  }}>
                    · {selectedIds.size === outstandingInvoices.length ? 'Deselect all' : 'Select all'}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* ── Outstanding invoices ──────────────────────────────────────── */}
          <OutstandingFeesList
            invoices={outstandingInvoices}
            activeInvoiceId={activeInvoiceId}
            onCollect={can('payment.create') && selectedIds.size === 0 ? handleCollect : undefined}
            selectedIds={can('payment.create') && outstandingInvoices.length > 1 ? selectedIds : undefined}
            onToggleSelect={can('payment.create') && outstandingInvoices.length > 1 ? handleToggleSelect : undefined}
            onPaySelected={can('payment.create') ? handlePaySelected : undefined}
            onVoid={can('invoice.void') ? handleVoidClick : undefined}
          />

          {/* ── Inline single-invoice payment form ───────────────────────── */}
          {activeInvoice && selectedIds.size === 0 && (
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
                  currency={activeInvoice.currency || tenantCurrency}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            </>
          )}

          <Separator />

          {/* ── Payment history ───────────────────────────────────────────── */}
          <PaymentHistoryList memberId={memberId} />

          {/* ── Wallet payouts ────────────────────────────────────────────── */}
          {walletPayouts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Wallet Payouts
                </p>
                <div className="space-y-2">
                  {walletPayouts.map((payout) => (
                    <div
                      key={payout._id}
                      className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-500/10 px-3 py-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                        {payout.medium === 'cash'
                          ? <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                          : <Landmark  className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-500 leading-tight">
                          {formatCurrency(payout.amount, tenantCurrency)} paid out
                          {' '}
                          <span className="font-normal text-emerald-500">
                            via {payout.medium === 'cash' ? 'Cash' : 'Bank Transfer'}
                          </span>
                        </p>
                        {payout.notes && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {payout.notes}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {formatDate(payout.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Wallet transaction ledger ──────────────────────────────────── */}
          {walletTransactions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet Ledger
                </p>
                <div className="space-y-1 divide-y rounded-lg border overflow-hidden">
                  {walletTransactions.map((txn: any) => (
                    <div key={txn._id} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full shrink-0',
                        txn.type === 'credit'
                          ? 'bg-emerald-500/15'
                          : 'bg-red-500/15',
                      )}>
                        {txn.type === 'credit'
                          ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                          : <ArrowUpRight  className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize text-foreground">
                          {txn.source?.replace(/_/g, ' ') ?? txn.type}
                        </p>
                        {txn.note && (
                          <p className="text-[11px] text-muted-foreground truncate">{txn.note}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          'text-sm font-semibold',
                          txn.type === 'credit' ? 'text-emerald-600' : 'text-red-500',
                        )}>
                          {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount, tenantCurrency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(txn.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Multi-invoice payment dialog */}
      {multiPayOpen && (
        <MultiInvoicePaymentDialog
          open={multiPayOpen}
          onOpenChange={setMultiPayOpen}
          invoices={selectedInvoices}
          currency={currency}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* New Invoice form — pre-fills member + branch */}
      <InvoiceForm
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        defaultMemberId={memberId}
        defaultBranchId={branchId}
      />

      {/* Void invoice confirmation dialog */}
      <Dialog
        open={!!voidInvoiceId}
        onOpenChange={(open) => {
          if (!open) { setVoidInvoiceId(null); setVoidReason(''); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently void the invoice and remove it from outstanding fees.
              This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="voidReason">Reason *</Label>
              <Input
                id="voidReason"
                placeholder="e.g. Created by mistake, duplicate invoice…"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                disabled={voidMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setVoidInvoiceId(null); setVoidReason(''); }}
              disabled={voidMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={!voidReason.trim() || voidMutation.isPending}
            >
              {voidMutation.isPending ? 'Voiding…' : 'Void Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
