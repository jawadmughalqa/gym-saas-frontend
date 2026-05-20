/**
 * useInvoicePayments
 *
 * Fetches the payment timeline for a single invoice.
 * Calls GET /invoices/:invoiceId/payments — an endpoint added after the last
 * api:gen run, so this hook is hand-crafted rather than Orval-generated.
 *
 * Returns:
 *   invoice  — summary (invoiceNumber, total, amountPaid, amountDue, status,
 *               currency, lineItems, createdAt)
 *   payments — list of payments sorted oldest-first (timeline order)
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceLineItemSummary {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type?: string;
}

export interface InvoiceSummary {
  _id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  currency: string;
  lineItems: InvoiceLineItemSummary[];
  createdAt: string;
}

export interface PaymentEntry {
  _id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  notes?: string;
  reference?: string;
  totalRefunded?: number;
  netAmount?: number;
  currency?: string;
}

export interface InvoicePaymentsResult {
  invoice: InvoiceSummary;
  payments: PaymentEntry[];
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

const fetchInvoicePayments = async (invoiceId: string): Promise<InvoicePaymentsResult> => {
  const res = await api.get<{ success: boolean; data: InvoicePaymentsResult }>(
    `/invoices/${invoiceId}/payments`,
  );
  return res.data.data;
};

export const INVOICE_PAYMENTS_KEY = (invoiceId: string) =>
  ['invoices', invoiceId, 'payments'] as const;

export function useInvoicePayments(invoiceId: string | null, enabled = true) {
  return useQuery({
    queryKey: INVOICE_PAYMENTS_KEY(invoiceId ?? ''),
    queryFn: () => fetchInvoicePayments(invoiceId!),
    enabled: !!invoiceId && enabled,
    staleTime: 1000 * 30, // 30s — fresh enough for a UI that refreshes on payment
  });
}
