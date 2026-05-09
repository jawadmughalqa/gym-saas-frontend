import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type {
  Invoice, Payment, Discount, InstalmentPlan,
  InvoiceListResponse, PaymentListResponse, DiscountListResponse, InstalmentListResponse,
  ValidateDiscountResult,
  ListInvoicesQuery, ListPaymentsQuery,
  CreateInvoiceDto, UpdateInvoiceDto, IssueInvoiceDto, VoidInvoiceDto,
  ApplyDiscountDto, RecordPaymentDto, RefundPaymentDto,
  CreateDiscountDto, UpdateDiscountDto, ValidateDiscountDto,
  CreateInstalmentPlanDto, RecordInstalmentPaymentDto,
} from '@/types/billing.types';

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function listInvoices(query: ListInvoicesQuery) {
  const { data } = await api.get<ApiResponse<InvoiceListResponse>>('/invoices', { params: query });
  return data.data;
}

export async function getInvoice(invoiceId: string) {
  const { data } = await api.get<ApiResponse<Invoice>>(`/invoices/${invoiceId}`);
  return data.data;
}

export async function createInvoice(body: CreateInvoiceDto) {
  const { data } = await api.post<ApiResponse<Invoice>>('/invoices', body);
  return data.data;
}

export async function updateInvoice(invoiceId: string, body: UpdateInvoiceDto) {
  const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${invoiceId}`, body);
  return data.data;
}

export async function issueInvoice(invoiceId: string, body: IssueInvoiceDto = {}) {
  const { data } = await api.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/issue`, body);
  return data.data;
}

export async function voidInvoice(invoiceId: string, body: VoidInvoiceDto) {
  const { data } = await api.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/void`, body);
  return data.data;
}

export async function applyDiscount(invoiceId: string, body: ApplyDiscountDto) {
  const { data } = await api.post<ApiResponse<Invoice>>(`/invoices/${invoiceId}/discount`, body);
  return data.data;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function listPayments(query: ListPaymentsQuery) {
  const { data } = await api.get<ApiResponse<PaymentListResponse>>('/payments', { params: query });
  return data.data;
}

export async function getPayment(paymentId: string) {
  const { data } = await api.get<ApiResponse<Payment>>(`/payments/${paymentId}`);
  return data.data;
}

export async function recordPayment(body: RecordPaymentDto) {
  const { data } = await api.post<ApiResponse<Payment>>('/payments', body);
  return data.data;
}

export async function refundPayment(paymentId: string, body: RefundPaymentDto) {
  const { data } = await api.post<ApiResponse<Payment>>(`/payments/${paymentId}/refund`, body);
  return data.data;
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export async function listDiscounts() {
  const { data } = await api.get<ApiResponse<DiscountListResponse>>('/discounts');
  return data.data.discounts;
}

export async function getDiscount(discountId: string) {
  const { data } = await api.get<ApiResponse<Discount>>(`/discounts/${discountId}`);
  return data.data;
}

export async function createDiscount(body: CreateDiscountDto) {
  const { data } = await api.post<ApiResponse<Discount>>('/discounts', body);
  return data.data;
}

export async function updateDiscount(discountId: string, body: UpdateDiscountDto) {
  const { data } = await api.patch<ApiResponse<Discount>>(`/discounts/${discountId}`, body);
  return data.data;
}

export async function validateDiscount(body: ValidateDiscountDto) {
  const { data } = await api.post<ApiResponse<ValidateDiscountResult>>('/discounts/validate', body);
  return data.data;
}

// ─── Instalment Plans ─────────────────────────────────────────────────────────

export async function listInstalmentPlans(memberId?: string) {
  const { data } = await api.get<ApiResponse<InstalmentListResponse>>('/instalments', {
    params: memberId ? { memberId } : {},
  });
  return data.data.plans;
}

export async function getInstalmentPlan(planId: string) {
  const { data } = await api.get<ApiResponse<InstalmentPlan>>(`/instalments/${planId}`);
  return data.data;
}

export async function createInstalmentPlan(body: CreateInstalmentPlanDto) {
  const { data } = await api.post<ApiResponse<InstalmentPlan>>('/instalments', body);
  return data.data;
}

export async function recordInstalmentPayment(planId: string, body: RecordInstalmentPaymentDto) {
  const { data } = await api.post<ApiResponse<InstalmentPlan>>(`/instalments/${planId}/pay`, body);
  return data.data;
}

export async function cancelInstalmentPlan(planId: string, reason: string) {
  const { data } = await api.post<ApiResponse<InstalmentPlan>>(`/instalments/${planId}/cancel`, { reason });
  return data.data;
}
