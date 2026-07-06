/**
 * InvoicePaymentModal
 *
 * A comprehensive invoice detail + payment collection modal that opens from
 * the Billing Dashboard when the gym owner clicks any invoice row.
 *
 * Features:
 *   • Member info header (name, email, phone, branch)
 *   • Overdue highlighting — red border, badge, warning strip
 *   • Line items breakdown table with per-item discount + subtotals
 *   • Discount section: coupon code dropdown OR manual discount (fixed/%)
 *   • Payment method tabs: Cash | Card | Bank Transfer | JazzCash | EasyPaisa | Cheque | Online
 *     – each tab shows method-specific extra fields
 *   • Auto payment status derived from amount entered vs. amount due
 *   • Confirmation step before submitting
 *   • Receipt panel post-payment with print / PDF download actions
 *   • Payment history list
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle, CheckCircle2, CreditCard, Banknote, Smartphone,
  FileText, Printer, Download, X, Loader2, ChevronRight,
  User, Building2, Phone, Mail, Calendar, Hash, Tag,
  Receipt, Clock, RotateCcw, ExternalLink, MessageCircle, History,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/use-permission';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

import { useMutation } from '@tanstack/react-query';
import { orvalMutator } from '@/lib/orval-mutator';
import {
  useGetInvoicesInvoiceId,
  usePostInvoicesInvoiceIdDiscount,
  getGetInvoicesInvoiceIdQueryKey,
} from '@/api/generated/invoices/invoices';
import {
  usePostPayments,
  useGetPayments,
  getGetPaymentsQueryKey,
} from '@/api/generated/payments/payments';
import {
  useGetDiscounts,
} from '@/api/generated/discounts/discounts';
import { getGetBillingRecentTransactionsQueryKey } from '@/api/generated/billing/billing';
import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import { buildGymInvoicePdf } from '@/utils/invoice-pdf';
import InvoiceActivityFeed from './InvoiceDetail/InvoiceActivityFeed';
import { PHONE } from '@/config/tenant.config';
import type { Invoice, InvoiceLineItem } from '@/types/billing.types';

// ─── Constants ─────────────────────────────────────────────────────────────────

type PayMethodTab =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'jazzcash'
  | 'easypaisa'
  | 'cheque'
  | 'online';

const PAY_METHODS: { value: PayMethodTab; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',          label: 'Cash',          icon: <Banknote className="h-4 w-4" /> },
  { value: 'card',          label: 'Card',          icon: <CreditCard className="h-4 w-4" /> },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: <Building2 className="h-4 w-4" /> },
  { value: 'jazzcash',      label: 'JazzCash',      icon: <Smartphone className="h-4 w-4" /> },
  { value: 'easypaisa',     label: 'EasyPaisa',     icon: <Smartphone className="h-4 w-4" /> },
  { value: 'cheque',        label: 'Cheque',        icon: <FileText className="h-4 w-4" /> },
  { value: 'online',        label: 'Online',        icon: <ExternalLink className="h-4 w-4" /> },
];

// Map UI payment method tabs to backend payment method enum
function toBackendMethod(tab: PayMethodTab): string {
  return tab;
}

// ─── Zod schema ────────────────────────────────────────────────────────────────

const paySchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0'),
  method: z.enum(['cash', 'card', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque', 'online'] as const),
  // Method-specific fields
  reference:      z.string().optional(),
  transactionId:  z.string().optional(),
  bankName:       z.string().optional(),
  accountNumber:  z.string().optional(),
  mobileNumber:   z.string().optional(),
  chequeNumber:   z.string().optional(),
  chequeDate:     z.string().optional(),
  notes:          z.string().optional(),
});
type PayFormValues = z.infer<typeof paySchema>;

// ─── Helper components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    overdue:        { cls: 'bg-red-500/10 text-red-500 border-red-300',       label: 'Overdue' },
    partially_paid: { cls: 'bg-orange-500/10 text-orange-500 border-orange-300', label: 'Partial' },
    issued:         { cls: 'bg-blue-500/10 text-blue-500 border-blue-300',    label: 'Issued' },
    draft:          { cls: 'bg-muted text-muted-foreground border-border', label: 'Draft' },
    paid:           { cls: 'bg-green-500/10 text-green-500 border-green-300', label: 'Paid' },
    void:           { cls: 'bg-muted text-muted-foreground border-border', label: 'Void' },
  };
  const c = cfg[status] ?? cfg['draft'];
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold', c.cls)}>
      {c.label}
    </Badge>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground text-xs w-16 shrink-0">{label}</span>
      <span className="font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

// ─── Line items table ──────────────────────────────────────────────────────────

function LineItemsTable({
  items,
  currency,
  invoiceDiscount,
}: {
  items: InvoiceLineItem[];
  currency: string;
  invoiceDiscount?: number;
}) {
  const subtotal = items.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
  const lineDiscounts = items.reduce((s, li) => s + (li.discountAmount ?? 0), 0);
  const taxTotal = items.reduce((s, li) => s + (li.taxAmount ?? 0), 0);
  const invDisc = invoiceDiscount ?? 0;
  const grandTotal = subtotal - lineDiscounts - invDisc + taxTotal;

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-12">Qty</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Unit Price</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Discount</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((li, i) => {
            const lineTotal = li.unitPrice * li.quantity - (li.discountAmount ?? 0) + (li.taxAmount ?? 0);
            return (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{li.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">{li.type.replace('_', ' ')}</p>
                </td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{li.quantity}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(li.unitPrice, currency)}</td>
                <td className="px-3 py-2.5 text-right text-orange-600">
                  {(li.discountAmount ?? 0) > 0 ? `-${formatCurrency(li.discountAmount!, currency)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(lineTotal, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals footer */}
      <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        {lineDiscounts > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Line discounts</span>
            <span>-{formatCurrency(lineDiscounts, currency)}</span>
          </div>
        )}
        {invDisc > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Invoice discount</span>
            <span>-{formatCurrency(invDisc, currency)}</span>
          </div>
        )}
        {taxTotal > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax</span>
            <span>{formatCurrency(taxTotal, currency)}</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex justify-between text-base font-bold">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal, currency)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Payment status pill (preview before submit) ───────────────────────────────

function PaymentStatusPill({
  entered,
  amountDue,
  currency,
}: {
  entered: number;
  amountDue: number;
  currency: string;
}) {
  if (!entered || entered <= 0) return null;

  const remaining = amountDue - entered;

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/25 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-500">Fully Paid</span>
      </div>
    );
  }

  if (entered > 0 && entered < amountDue) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-orange-500/10 border border-orange-500/25 px-3 py-2">
        <Clock className="h-4 w-4 text-orange-600 shrink-0" />
        <span className="text-sm font-medium text-orange-500">
          Partial — {formatCurrency(remaining, currency)} remaining
        </span>
      </div>
    );
  }

  return null;
}

// ─── Method-specific extra fields ─────────────────────────────────────────────

function MethodExtraFields({
  method,
  register,
  errors,
  disabled,
  control,
}: {
  method: PayMethodTab;
  register: ReturnType<typeof useForm<PayFormValues>>['register'];
  errors: ReturnType<typeof useForm<PayFormValues>>['formState']['errors'];
  disabled: boolean;
  control: ReturnType<typeof useForm<PayFormValues>>['control'];
}) {
  if (method === 'cash') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Reference / Receipt # <span className="text-muted-foreground">(optional)</span></Label>
        <Input placeholder="e.g. RCP-001" disabled={disabled} className="h-9" {...register('reference')} />
      </div>
    );
  }

  if (method === 'card') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction ID <span className="text-muted-foreground">(optional)</span></Label>
          <Input placeholder="e.g. TXN-123456" disabled={disabled} className="h-9" {...register('transactionId')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">POS Reference <span className="text-muted-foreground">(optional)</span></Label>
          <Input placeholder="e.g. POS-9876" disabled={disabled} className="h-9" {...register('reference')} />
        </div>
      </div>
    );
  }

  if (method === 'bank_transfer') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Bank Name</Label>
          <Input placeholder="e.g. HBL, UBL" disabled={disabled} className="h-9" {...register('bankName')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction ID</Label>
          <Input placeholder="Transfer ref / TRN" disabled={disabled} className="h-9" {...register('transactionId')} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Account / IBAN <span className="text-muted-foreground">(optional)</span></Label>
          <Input placeholder="Sender account last 4 or IBAN" disabled={disabled} className="h-9" {...register('accountNumber')} />
        </div>
      </div>
    );
  }

  if (method === 'jazzcash' || method === 'easypaisa') {
    const label = method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa';
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{label} Mobile Number</Label>
          <Input placeholder={PHONE.placeholder} disabled={disabled} className="h-9" {...register('mobileNumber')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction ID</Label>
          <Input placeholder="e.g. T12345678" disabled={disabled} className="h-9" {...register('transactionId')} />
        </div>
      </div>
    );
  }

  if (method === 'cheque') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Cheque Number *</Label>
          <Input placeholder="e.g. 00123456" disabled={disabled} className="h-9" {...register('chequeNumber')} />
          {errors.chequeNumber && <p className="text-xs text-destructive">{errors.chequeNumber.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cheque Date</Label>
          <Controller
            control={control}
            name="chequeDate"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? ''}
                onChange={(v) => field.onChange(v ?? '')}
              />
            )}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Bank Name</Label>
          <Input placeholder="Issuing bank" disabled={disabled} className="h-9" {...register('bankName')} />
        </div>
      </div>
    );
  }

  if (method === 'online') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction ID</Label>
          <Input placeholder="Gateway transaction ID" disabled={disabled} className="h-9" {...register('transactionId')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reference</Label>
          <Input placeholder="Order / ref number" disabled={disabled} className="h-9" {...register('reference')} />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Receipt panel (shown post-payment) ───────────────────────────────────────

function ReceiptPanel({
  invoice,
  paymentAmount,
  method,
  gymName,
  onClose,
}: {
  invoice: Invoice;
  paymentAmount: number;
  method: string;
  gymName?: string;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!receiptRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; }
            .total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
            .divider { border-top: 1px solid #ccc; margin: 12px 0; }
            .badge { background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0">Payment Receipt</h2>
            <p style="margin:4px 0;color:#666">Invoice ${invoice.invoiceNumber}</p>
          </div>
          <div class="divider"></div>
          <div class="row"><span>Member</span><span>${invoice.memberId?.firstName} ${invoice.memberId?.lastName}</span></div>
          <div class="row"><span>Date</span><span>${new Date().toLocaleDateString()}</span></div>
          <div class="row"><span>Method</span><span style="text-transform:capitalize">${method.replace('_', ' ')}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Invoice Total</span><span>${formatCurrency(invoice.total, invoice.currency)}</span></div>
          <div class="row"><span>Amount Paid</span><span>${formatCurrency(paymentAmount, invoice.currency)}</span></div>
          ${invoice.amountDue - paymentAmount > 0 ? `<div class="row"><span>Remaining Balance</span><span>${formatCurrency(invoice.amountDue - paymentAmount, invoice.currency)}</span></div>` : ''}
          <div class="total row"><span>PAID</span><span>${formatCurrency(paymentAmount, invoice.currency)}</span></div>
          <div class="divider"></div>
          <p style="text-align:center"><span class="badge">PAYMENT SUCCESSFUL</span></p>
          <p style="text-align:center;color:#666;font-size:12px;margin-top:16px">Thank you for your payment!</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  const remainingAfter = Math.max(0, invoice.amountDue - paymentAmount);
  const isFullyPaid = remainingAfter <= 0;
  const memberName = `${invoice.memberId?.firstName ?? ''} ${invoice.memberId?.lastName ?? ''}`.trim();
  const memberPhone = invoice.memberId?.phone ?? '';

  function handleWhatsApp() {
    if (!memberPhone) return;
    const gym = gymName ?? 'Gym';
    const date = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const lines: string[] = [
      `*${gym} — Payment Receipt*`,
      `─────────────────────`,
      `📋 *Invoice:* ${invoice.invoiceNumber ?? '—'}`,
      `👤 *Member:* ${memberName || '—'}`,
      `📅 *Date:* ${date}`,
      ``,
      `*This Payment*`,
      `💰 Amount Paid: ${formatCurrency(paymentAmount, invoice.currency)}`,
      `💳 Method: ${method.replace(/_/g, ' ')}`,
      ``,
      `*Invoice Summary*`,
      `🧾 Invoice Total: ${formatCurrency(invoice.total, invoice.currency)}`,
      `✅ Total Paid: ${formatCurrency(invoice.amountPaid, invoice.currency)}`,
    ];
    if (remainingAfter > 0) {
      lines.push(`⚠️ *Balance Due: ${formatCurrency(remainingAfter, invoice.currency)}*`);
    } else {
      lines.push(`✅ *Fully Paid — Thank you!*`);
    }
    lines.push(``, `Thank you for being a valued member of ${gym}!`);

    // Sanitize phone: strip spaces/dashes, ensure international format
    const rawPhone = memberPhone.replace(/[\s\-()]/g, '');
    const phone = rawPhone.startsWith('+') ? rawPhone.replace('+', '') : rawPhone;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/25 px-4 py-3">
        <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-500">Payment Recorded!</p>
          <p className="text-sm text-green-500">
            {formatCurrency(paymentAmount, invoice.currency)} collected via{' '}
            <span className="capitalize">{method.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Receipt preview */}
      <div
        ref={receiptRef}
        className="rounded-lg border bg-card p-4 space-y-3 font-mono text-sm"
      >
        <div className="text-center space-y-0.5">
          <p className="font-bold text-base">PAYMENT RECEIPT</p>
          <p className="text-muted-foreground text-xs">{invoice.invoiceNumber}</p>
        </div>
        <Separator />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member</span>
            <span>{invoice.memberId?.firstName} {invoice.memberId?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method</span>
            <span className="capitalize">{method.replace('_', ' ')}</span>
          </div>
        </div>
        <Separator />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice Total</span>
            <span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Amount Paid</span>
            <span>{formatCurrency(paymentAmount, invoice.currency)}</span>
          </div>
          {remainingAfter > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Remaining</span>
              <span>{formatCurrency(remainingAfter, invoice.currency)}</span>
            </div>
          )}
        </div>
        <Separator />
        <div className="text-center">
          <span className={cn(
            'inline-block px-4 py-1 rounded-full text-xs font-bold',
            isFullyPaid
              ? 'bg-green-500/15 text-green-500'
              : 'bg-orange-500/15 text-orange-500',
          )}>
            {isFullyPaid ? 'FULLY PAID' : 'PARTIAL PAYMENT'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="flex-1 min-w-[100px]" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Print
        </Button>
        {memberPhone && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[100px] text-green-500 border-green-300 hover:bg-green-500/10"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            WhatsApp
          </Button>
        )}
        <Button size="sm" className="flex-1 min-w-[100px]" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

// ─── Payment history ───────────────────────────────────────────────────────────

function PaymentHistory({ invoiceId, currency }: { invoiceId: string; currency: string }) {
  const { data, isLoading } = useGetPayments(
    { invoiceId, limit: 20 },
    { query: { staleTime: 1000 * 30 } },
  );

  const payments: any[] = (data as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="flex gap-3 items-center">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
    );
  }

  return (
    <div className="space-y-1 divide-y">
      {payments.map((p: any) => (
        <div key={p._id} className="flex items-center gap-3 py-2">
          <div className="h-7 w-7 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{(p.method ?? '').replace('_', ' ')}</p>
            <p className="text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)}</p>
            {p.reference && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {p.reference}</p>
            )}
          </div>
          <p className="text-sm font-semibold text-green-500">{formatCurrency(p.amount, currency)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Discount section ──────────────────────────────────────────────────────────

interface DiscountSectionProps {
  invoiceId: string;
  invoiceTotal: number;
  currency: string;
  memberId: string;
  appliedCode?: string;
  onApplied: () => void;
  disabled?: boolean;
}

function DiscountSection({
  invoiceId,
  invoiceTotal,
  currency,
  appliedCode,
  onApplied,
  disabled,
}: DiscountSectionProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'coupon' | 'manual'>('coupon');
  const [selectedCode, setSelectedCode] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'fixed' | 'percent'>('fixed');
  const [manualReason, setManualReason] = useState('');

  // Fetch available discount codes (filter to active ones client-side)
  const { data: discountsData, isLoading: loadingCodes } = useGetDiscounts(
    { query: { staleTime: 1000 * 60 * 5 } },
  );
  const allDiscounts: any[] = (discountsData as any)?.data ?? [];
  const discounts = allDiscounts.filter((d: any) => d.isActive !== false);

  function invalidateActivity() {
    queryClient.invalidateQueries({ queryKey: ['invoice-activity', invoiceId] });
  }

  const applyDiscount = usePostInvoicesInvoiceIdDiscount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
        invalidateActivity();
        toast({ title: 'Discount applied' });
        onApplied();
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Failed to apply discount',
          description: err?.response?.data?.message ?? err?.message,
        });
      },
    },
  });

  const applyManualDiscount = useMutation({
    mutationFn: (data: { amount: number; reason?: string }) =>
      orvalMutator<unknown>({
        url: `/invoices/${invoiceId}/manual-discount`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
      invalidateActivity();
      toast({ title: 'Manual discount applied' });
      onApplied();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to apply discount',
        description: err?.response?.data?.message ?? err?.message,
      });
    },
  });

  const removeDiscount = useMutation({
    mutationFn: () =>
      orvalMutator<unknown>({
        url: `/invoices/${invoiceId}/discount`,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId) });
      invalidateActivity();
      toast({ title: 'Discount removed' });
      onApplied();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to remove discount',
        description: err?.response?.data?.message ?? err?.message,
      });
    },
  });

  const isPendingAny = applyDiscount.isPending || applyManualDiscount.isPending || removeDiscount.isPending;

  function handleApply() {
    if (mode === 'coupon') {
      if (!selectedCode) return;
      applyDiscount.mutate({ invoiceId, data: { discountCode: selectedCode } });
    } else {
      const amt = parseFloat(manualAmount);
      if (!amt || amt <= 0) {
        toast({ variant: 'destructive', title: 'Enter a valid discount amount' });
        return;
      }
      const finalAmount = manualType === 'percent'
        ? (invoiceTotal * amt) / 100
        : amt;
      applyManualDiscount.mutate({
        amount: finalAmount,
        reason: manualReason || undefined,
      });
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-green-500/10 border border-green-500/25 px-3 py-2">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Tag className="h-3.5 w-3.5 text-green-600 shrink-0" />
          <span className="text-green-500 font-medium">Discount applied:</span>
          <span className="font-mono text-green-500 truncate">{appliedCode}</span>
        </div>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-500 shrink-0"
            onClick={() => removeDiscount.mutate()}
            disabled={isPendingAny}
          >
            {removeDiscount.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('coupon')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
            mode === 'coupon'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50',
          )}
        >
          Coupon Code
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
            mode === 'manual'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50',
          )}
        >
          Manual Discount
        </button>
      </div>

      {mode === 'coupon' ? (
        <div className="flex gap-2">
          <Select value={selectedCode} onValueChange={setSelectedCode} disabled={loadingCodes || disabled}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder={loadingCodes ? 'Loading codes…' : 'Select a promo code'} />
            </SelectTrigger>
            <SelectContent>
              {discounts.map((d: any) => (
                <SelectItem key={d._id} value={d.code}>
                  <span className="font-mono font-semibold">{d.code}</span>
                  {d.description && <span className="text-muted-foreground ml-2 text-xs">— {d.description}</span>}
                  <span className="ml-2 text-xs text-primary">
                    {d.discountType === 'percentage' ? `${d.value}% off` : `-${formatCurrency(d.value, currency)}`}
                  </span>
                </SelectItem>
              ))}
              {discounts.length === 0 && !loadingCodes && (
                <SelectItem value="__none" disabled>No active codes</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            disabled={!selectedCode || isPendingAny || disabled}
            onClick={handleApply}
          >
            {isPendingAny ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex rounded-md border overflow-hidden h-9">
              <button
                type="button"
                onClick={() => setManualType('fixed')}
                className={cn(
                  'px-3 text-xs font-medium transition-colors',
                  manualType === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {currency}
              </button>
              <button
                type="button"
                onClick={() => setManualType('percent')}
                className={cn(
                  'px-3 text-xs font-medium transition-colors',
                  manualType === 'percent' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                %
              </button>
            </div>
            <Input
              type="number"
              placeholder={manualType === 'fixed' ? 'Amount' : '0–100'}
              min="0"
              max={manualType === 'percent' ? 100 : undefined}
              value={manualAmount}
              onChange={e => setManualAmount(e.target.value)}
              className="h-9 flex-1"
              disabled={disabled}
            />
          </div>
          <Input
            placeholder="Reason (e.g. Staff discount, Special offer)"
            value={manualReason}
            onChange={e => setManualReason(e.target.value)}
            className="h-9"
            disabled={disabled}
          />
          {manualAmount && parseFloat(manualAmount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Discount:{' '}
              {manualType === 'fixed'
                ? formatCurrency(parseFloat(manualAmount), currency)
                : `${formatCurrency((invoiceTotal * parseFloat(manualAmount)) / 100, currency)} (${manualAmount}%)`}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full h-9"
            disabled={!manualAmount || parseFloat(manualAmount) <= 0 || isPendingAny || disabled}
            onClick={handleApply}
          >
            {isPendingAny ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply Manual Discount'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

interface InvoicePaymentModalProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called after a payment is recorded so parent can refetch lists */
  onPaymentRecorded?: () => void;
}

type ModalView = 'detail' | 'confirm' | 'receipt';

export function InvoicePaymentModal({
  invoiceId,
  open,
  onOpenChange,
  onPaymentRecorded,
}: InvoicePaymentModalProps) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { data: tenantData } = useGetMyTenant({ query: { staleTime: 1000 * 60 * 10 } });
  const gymName: string | undefined = (tenantData?.data as any)?.name;
  const [view, setView] = useState<ModalView>('detail');
  const [activeTab, setActiveTab] = useState<PayMethodTab>('cash');
  const [pendingPayment, setPendingPayment] = useState<{ amount: number; method: string } | null>(null);

  // Fetch invoice
  const { data: invoiceRes, isLoading } = useGetInvoicesInvoiceId(invoiceId ?? '', {
    query: { enabled: !!invoiceId && open, staleTime: 1000 * 30 },
  });
  const invoice: Invoice | undefined = (invoiceRes as any)?.data;

  // Payment mutation
  const recordPayment = usePostPayments({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoiceId ?? '') });
        queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['invoice-activity', invoiceId ?? ''] });
        // Invalidate the recent-transactions panel so it shows the updated invoice state immediately
        queryClient.invalidateQueries({ queryKey: getGetBillingRecentTransactionsQueryKey() });
        onPaymentRecorded?.();
        toast({ title: 'Payment recorded successfully' });
        setView('receipt');
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Payment failed',
          description: err?.message,
        });
        setView('detail');
      },
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      method: 'cash',
      amount: 0,
    },
  });

  // Keep form amount in sync when invoice loads
  useEffect(() => {
    if (invoice?.amountDue != null) {
      reset({ method: activeTab, amount: invoice.amountDue });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.amountDue, invoice?._id]);

  // Reset view when modal opens/closes
  useEffect(() => {
    if (!open) {
      setView('detail');
      reset({ method: 'cash', amount: 0 });
      setPendingPayment(null);
    }
  }, [open, reset]);

  const watchedAmount = watch('amount');
  const isOverdue = invoice?.status === 'overdue' ||
    (!!invoice?.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid');

  const canCollect = can('payment.create') &&
    invoice &&
    ['issued', 'partially_paid', 'overdue'].includes(invoice.status);

  function onSubmit(values: PayFormValues) {
    if (!invoice) return;
    setPendingPayment({ amount: values.amount, method: values.method });
    setView('confirm');
  }

  function confirmAndSubmit() {
    if (!invoice || !pendingPayment) return;

    const values = pendingPayment;
    const formValues = watch();

    // Build reference from method-specific fields
    const parts: string[] = [];
    if (formValues.transactionId) parts.push(`TXN:${formValues.transactionId}`);
    if (formValues.reference) parts.push(formValues.reference);
    if (formValues.chequeNumber) parts.push(`CHQ:${formValues.chequeNumber}`);
    if (formValues.mobileNumber) parts.push(`MOB:${formValues.mobileNumber}`);
    const reference = parts.join(' / ') || undefined;

    const noteParts: string[] = [];
    if (formValues.bankName) noteParts.push(`Bank: ${formValues.bankName}`);
    if (formValues.accountNumber) noteParts.push(`Acct: ${formValues.accountNumber}`);
    if (formValues.chequeDate) noteParts.push(`Cheque Date: ${formValues.chequeDate}`);
    if (formValues.notes) noteParts.push(formValues.notes);
    const notes = noteParts.join('. ') || undefined;

    recordPayment.mutate({
      data: {
        invoiceId: invoice._id,
        amount: values.amount,
        method: toBackendMethod(values.method as PayMethodTab) as any,
        reference,
        notes,
      },
    });
  }

  function handleClose() {
    onOpenChange(false);
  }

  // ── Invoice-level share / print / download ─────────────────────────────────

  function buildInvoiceWhatsApp(inv: Invoice, gym: string | undefined) {
    const phone = inv.memberId?.phone ?? '';
    if (!phone) return null;
    const memberName = `${inv.memberId?.firstName ?? ''} ${inv.memberId?.lastName ?? ''}`.trim();
    const date = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const lines = [
      `*${gym ?? 'Gym'} — Invoice*`,
      `─────────────────────`,
      `📋 *Invoice:* ${inv.invoiceNumber ?? '—'}`,
      `👤 *Member:* ${memberName || '—'}`,
      `📅 *Date:* ${date}`,
      ``,
    ];
    // Line items
    if (inv.lineItems && inv.lineItems.length > 0) {
      lines.push(`*Charges:*`);
      inv.lineItems.forEach((li: any) => {
        const amt = (li.unitPrice ?? li.total ?? 0);
        lines.push(`  • ${li.description ?? li.type}: ${formatCurrency(amt, inv.currency)}`);
      });
      lines.push(``);
    }
    lines.push(`💳 *Invoice Total:* ${formatCurrency(inv.total, inv.currency)}`);
    if ((inv.amountPaid ?? 0) > 0) {
      lines.push(`✅ *Paid:* ${formatCurrency(inv.amountPaid, inv.currency)}`);
    }
    if ((inv.amountDue ?? 0) > 0) {
      lines.push(`⚠️ *Balance Due: ${formatCurrency(inv.amountDue, inv.currency)}*`);
      if (inv.dueDate) {
        lines.push(`📆 *Due by:* ${new Date(inv.dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`);
      }
    } else {
      lines.push(`✅ *Fully Paid — Thank you!*`);
    }
    lines.push(``, `Thank you for choosing ${gym ?? 'us'}! 🏋️`);

    const rawPhone = phone.replace(/[\s\-()]/g, '');
    const cleanPhone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  function handleInvoiceWhatsApp() {
    if (!invoice) return;
    // WhatsApp's wa.me URL can only pre-fill text — files/PDFs cannot be sent
    // programmatically via URL. So we: 1) auto-download the PDF, 2) open WhatsApp
    // with the invoice summary text. The user can then attach the downloaded PDF
    // manually in WhatsApp if needed.
    const memberName = `${invoice.memberId?.firstName ?? ''} ${invoice.memberId?.lastName ?? ''}`.trim();
    const lineLabel = invoice.lineItems?.map((li: any) => li.description || li.type).join(', ') || 'Membership / Service';
    const doc = buildGymInvoicePdf({
      invoiceNumber: invoice.invoiceNumber ?? '',
      status: invoice.status ?? '',
      recipientName: memberName,
      recipientEmail: invoice.memberId?.email,
      currency: invoice.currency ?? 'PKR',
      total: invoice.total ?? 0,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      dueDate: invoice.dueDate ?? undefined,
      createdAt: invoice.createdAt,
      lineLabel,
      gymName: gymName ?? 'Gym',
    });
    doc.save(`${invoice.invoiceNumber ?? 'invoice'}.pdf`);

    // Small delay so the PDF download starts before WhatsApp tab opens
    setTimeout(() => {
      const url = buildInvoiceWhatsApp(invoice, gymName);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }, 400);
  }

  function handleInvoicePrint() {
    if (!invoice) return;
    const memberName = `${invoice.memberId?.firstName ?? ''} ${invoice.memberId?.lastName ?? ''}`.trim();
    const lineLabel = invoice.lineItems?.map((li: any) => li.description || li.type).join(', ') || 'Membership / Service';
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; font-size: 13px; color: #0f172a; }
            .header { background:#0f172a; color:#fff; padding:20px 24px; border-radius:8px 8px 0 0; margin-bottom:0; }
            .gym { font-size:20px; font-weight:bold; letter-spacing:1px; }
            .sub { font-size:10px; color:#38ce97; margin-top:2px; }
            .body { border:1px solid #e2e8f0; border-top:3px solid #0ea472; padding:20px 24px; border-radius:0 0 8px 8px; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
            .label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
            .value { font-size:13px; font-weight:600; color:#0f172a; margin-top:2px; }
            table { width:100%; border-collapse:collapse; margin:12px 0; }
            th { background:#0ea472; color:#fff; text-align:left; padding:8px 10px; font-size:11px; }
            td { padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:12px; }
            .totals { margin-top:12px; text-align:right; }
            .total-row { display:flex; justify-content:flex-end; gap:40px; padding:4px 0; font-size:13px; }
            .big { font-size:16px; font-weight:bold; color:#0ea472; border-top:2px solid #0ea472; padding-top:8px; margin-top:4px; }
            .badge { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:bold; background:#d1fae5; color:#065f46; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gym">${gymName?.toUpperCase() ?? 'GYM'}</div>
            <div class="sub">FITNESS & WELLNESS</div>
          </div>
          <div class="body">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
              <div>
                <div style="font-size:22px;font-weight:bold;color:#0f172a;">INVOICE</div>
                <div style="color:#64748b;font-size:11px;">${invoice.invoiceNumber}</div>
              </div>
              <span class="badge">${(invoice.status ?? '').toUpperCase().replace(/_/g,' ')}</span>
            </div>
            <div class="grid">
              <div><div class="label">Bill To</div><div class="value">${memberName || '—'}</div>
                ${invoice.memberId?.email ? `<div style="font-size:11px;color:#64748b;">${invoice.memberId.email}</div>` : ''}
                ${invoice.memberId?.phone ? `<div style="font-size:11px;color:#64748b;">${invoice.memberId.phone}</div>` : ''}
              </div>
              <div>
                <div class="label">Date</div><div class="value">${new Date().toLocaleDateString()}</div>
                ${invoice.dueDate ? `<div class="label" style="margin-top:8px;">Due Date</div><div class="value">${new Date(invoice.dueDate).toLocaleDateString()}</div>` : ''}
              </div>
            </div>
            <table>
              <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
              <tbody>
                ${(invoice.lineItems ?? []).map((li: any) => `
                  <tr><td>${li.description || li.type || 'Service'}</td><td style="text-align:right;">${formatCurrency(li.unitPrice ?? li.total ?? 0, invoice.currency)}</td></tr>
                `).join('')}
                ${(invoice.invoiceLevelDiscountAmount ?? 0) > 0 ? `<tr><td style="color:#16a34a;">Discount (${invoice.discountCode ?? 'applied'})</td><td style="text-align:right;color:#16a34a;">-${formatCurrency(invoice.invoiceLevelDiscountAmount ?? 0, invoice.currency)}</td></tr>` : ''}
              </tbody>
            </table>
            <div class="totals">
              <div class="total-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal ?? invoice.total, invoice.currency)}</span></div>
              ${(invoice.amountPaid ?? 0) > 0 ? `<div class="total-row"><span style="color:#16a34a;">Paid</span><span style="color:#16a34a;">${formatCurrency(invoice.amountPaid, invoice.currency)}</span></div>` : ''}
              <div class="total-row big"><span>Balance Due</span><span>${formatCurrency(invoice.amountDue, invoice.currency)}</span></div>
            </div>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px;">Thank you for choosing ${gymName ?? 'us'}!</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  function handleInvoiceDownload() {
    if (!invoice) return;
    const memberName = `${invoice.memberId?.firstName ?? ''} ${invoice.memberId?.lastName ?? ''}`.trim();
    const lineLabel = invoice.lineItems?.map((li: any) => li.description || li.type).join(', ') || 'Membership / Service';
    const doc = buildGymInvoicePdf({
      invoiceNumber: invoice.invoiceNumber ?? '',
      status: invoice.status ?? '',
      recipientName: memberName,
      recipientEmail: invoice.memberId?.email,
      currency: invoice.currency ?? 'PKR',
      total: invoice.total ?? 0,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      dueDate: invoice.dueDate ?? undefined,
      createdAt: invoice.createdAt,
      lineLabel,
      gymName: gymName ?? 'Gym',
    });
    doc.save(`${invoice.invoiceNumber ?? 'invoice'}.pdf`);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <Skeleton className="h-6 w-48" />
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Receipt view ───────────────────────────────────────────────────────────

  if (view === 'receipt' && pendingPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          <ReceiptPanel
            invoice={invoice}
            paymentAmount={pendingPayment.amount}
            method={pendingPayment.method}
            gymName={gymName}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // ── Confirm view ───────────────────────────────────────────────────────────

  if (view === 'confirm' && pendingPayment) {
    const methodLabel = PAY_METHODS.find(m => m.value === pendingPayment.method)?.label ?? pendingPayment.method;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member</span>
                <span className="font-medium">{invoice.memberId?.firstName} {invoice.memberId?.lastName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{methodLabel}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Amount</span>
                <span className="text-green-500">{formatCurrency(pendingPayment.amount, invoice.currency)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setView('detail')}
                disabled={recordPayment.isPending}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={confirmAndSubmit}
                disabled={recordPayment.isPending}
              >
                {recordPayment.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Confirm</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Detail view (main) ─────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 [&>button:last-of-type]:hidden',
          isOverdue && 'ring-2 ring-red-400 ring-offset-2',
        )}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className={cn(
          'pl-6 pr-6 pt-5 pb-4 shrink-0 rounded-t-lg',
          isOverdue ? 'bg-red-500/10 border-b border-red-500/25' : 'border-b',
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="font-mono text-lg">{invoice.invoiceNumber}</DialogTitle>
                <StatusBadge status={invoice.status} />
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/15 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    OVERDUE
                  </span>
                )}
              </div>

              {/* Member info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Member"
                  value={`${invoice.memberId?.firstName ?? ''} ${invoice.memberId?.lastName ?? ''}`} />
                {invoice.memberId?.phone && (
                  <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={invoice.memberId.phone} />
                )}
                {invoice.memberId?.email && (
                  <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={invoice.memberId.email} />
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {invoice.dueDate && (
                  <InfoRow
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Due Date"
                    value={
                      <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                        {formatDate(invoice.dueDate)}
                      </span>
                    }
                  />
                )}
                <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="Created" value={formatDate(invoice.createdAt)} />
              </div>
            </div>

            {/* Amount summary */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className={cn('text-2xl font-bold', isOverdue ? 'text-red-600' : 'text-foreground')}>
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </p>
              {invoice.amountPaid > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paid: {formatCurrency(invoice.amountPaid, invoice.currency)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* Overdue warning strip */}
            {isOverdue && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/25 px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-500 font-medium">
                  This invoice is overdue.{' '}
                  {invoice.dueDate && (
                    <span className="font-normal">
                      Was due on {formatDate(invoice.dueDate)} ({
                        Math.round((Date.now() - new Date(invoice.dueDate).getTime()) / 86_400_000)
                      } days ago).
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Line items */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Charges Breakdown</h3>
              <LineItemsTable
                items={invoice.lineItems}
                currency={invoice.currency}
                invoiceDiscount={invoice.invoiceLevelDiscountAmount}
              />
            </div>

            {/* Discount section — shows apply form OR applied badge with Remove button */}
            {canCollect && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {invoice.discountCode ? 'Discount' : 'Apply Discount'}
                </h3>
                <DiscountSection
                  invoiceId={invoice._id}
                  invoiceTotal={invoice.total}
                  currency={invoice.currency}
                  memberId={typeof invoice.memberId === 'string' ? invoice.memberId : invoice.memberId._id}
                  appliedCode={invoice.discountCode}
                  onApplied={() => {
                    queryClient.invalidateQueries({ queryKey: getGetInvoicesInvoiceIdQueryKey(invoice._id) });
                  }}
                />
              </div>
            )}

            {/* Payment form */}
            {canCollect && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Collect Payment
                </h3>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Amount field */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Amount ({invoice.currency}) *
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      className="h-9"
                      {...register('amount')}
                    />
                    {errors.amount && (
                      <p className="text-xs text-destructive">{errors.amount.message}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Outstanding: <span className="font-medium">{formatCurrency(invoice.amountDue, invoice.currency)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => reset(v => ({ ...v, amount: invoice.amountDue }))}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Use full amount
                      </button>
                    </div>
                  </div>

                  {/* Payment status preview */}
                  <PaymentStatusPill
                    entered={Number(watchedAmount)}
                    amountDue={invoice.amountDue}
                    currency={invoice.currency}
                  />

                  {/* Method tabs */}
                  <Controller
                    name="method"
                    control={control}
                    render={({ field }) => (
                      <Tabs
                        value={field.value}
                        onValueChange={(v) => { field.onChange(v); setActiveTab(v as PayMethodTab); }}
                      >
                        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted rounded-lg">
                          {PAY_METHODS.map(m => (
                            <TabsTrigger
                              key={m.value}
                              value={m.value}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                              {m.icon}
                              {m.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {PAY_METHODS.map(m => (
                          <TabsContent key={m.value} value={m.value} className="mt-3">
                            <MethodExtraFields
                              method={m.value}
                              register={register}
                              errors={errors}
                              disabled={false}
                              control={control}
                            />
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  />

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      placeholder="Any additional notes…"
                      rows={2}
                      className="resize-none text-sm"
                      {...register('notes')}
                    />
                  </div>

                  <Button type="submit" className="w-full h-9">
                    <ChevronRight className="h-4 w-4 mr-1.5" />
                    Review &amp; Confirm Payment
                  </Button>
                </form>
              </div>
            )}

            {/* Payment history */}
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Payment History
              </h3>
              <PaymentHistory invoiceId={invoice._id} currency={invoice.currency} />
            </div>

            {/* Memo */}
            {invoice.memo && (
              <div className="rounded-md bg-muted/30 border px-4 py-3 text-sm text-muted-foreground">
                <p className="text-xs font-semibold text-foreground mb-1 uppercase tracking-wide">Memo</p>
                {invoice.memo}
              </div>
            )}

            {/* Activity feed */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                <History className="h-3.5 w-3.5" />
                Activity
              </h3>
              <InvoiceActivityFeed invoiceId={invoice._id} compact />
            </div>

          </div>
        </ScrollArea>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t bg-muted/20 shrink-0 rounded-b-lg">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Totals summary */}
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatCurrency(invoice.total, invoice.currency)}</span>
              {invoice.amountPaid > 0 && (
                <> · Paid: <span className="font-semibold text-green-500">{formatCurrency(invoice.amountPaid, invoice.currency)}</span></>
              )}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {invoice.memberId?.phone && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-green-500 border-green-300 hover:bg-green-500/10 h-8 px-3"
                  onClick={handleInvoiceWhatsApp}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={handleInvoicePrint}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8 px-3" onClick={handleInvoiceDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-3" onClick={handleClose}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoicePaymentModal;
