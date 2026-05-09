import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listInvoices, getInvoice, createInvoice, updateInvoice,
  issueInvoice, voidInvoice, applyDiscount,
  listPayments, getPayment, recordPayment, refundPayment,
  listDiscounts, getDiscount, createDiscount, updateDiscount, validateDiscount,
  listInstalmentPlans, getInstalmentPlan, createInstalmentPlan,
  recordInstalmentPayment, cancelInstalmentPlan,
} from '@/api/billing.api';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import type {
  ListInvoicesQuery, ListPaymentsQuery,
  CreateInvoiceDto, UpdateInvoiceDto, IssueInvoiceDto, VoidInvoiceDto,
  ApplyDiscountDto, RecordPaymentDto, RefundPaymentDto,
  CreateDiscountDto, UpdateDiscountDto, ValidateDiscountDto,
  CreateInstalmentPlanDto, RecordInstalmentPaymentDto,
} from '@/types/billing.types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const billingKeys = {
  all:         ['billing'] as const,
  // Invoices
  invoices:    () => [...billingKeys.all, 'invoices'] as const,
  invoiceList: (q: ListInvoicesQuery) => [...billingKeys.invoices(), 'list', q] as const,
  invoice:     (id: string) => [...billingKeys.invoices(), id] as const,
  // Payments
  payments:    () => [...billingKeys.all, 'payments'] as const,
  paymentList: (q: ListPaymentsQuery) => [...billingKeys.payments(), 'list', q] as const,
  payment:     (id: string) => [...billingKeys.payments(), id] as const,
  // Discounts
  discounts:   () => [...billingKeys.all, 'discounts'] as const,
  discount:    (id: string) => [...billingKeys.discounts(), id] as const,
  // Instalments
  instalments: () => [...billingKeys.all, 'instalments'] as const,
  instalmentList: (memberId?: string) => [...billingKeys.instalments(), 'list', memberId] as const,
  instalment:  (id: string) => [...billingKeys.instalments(), id] as const,
};

// ─── Invoice Queries ──────────────────────────────────────────────────────────

export function useInvoices(query: ListInvoicesQuery) {
  return useQuery({
    queryKey: billingKeys.invoiceList(query),
    queryFn: () => listInvoices(query),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: billingKeys.invoice(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

// ─── Payment Queries ──────────────────────────────────────────────────────────

export function usePayments(query: ListPaymentsQuery) {
  return useQuery({
    queryKey: billingKeys.paymentList(query),
    queryFn: () => listPayments(query),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30,
  });
}

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: billingKeys.payment(paymentId),
    queryFn: () => getPayment(paymentId),
    enabled: !!paymentId,
  });
}

// ─── Discount Queries ─────────────────────────────────────────────────────────

export function useDiscounts() {
  return useQuery({
    queryKey: billingKeys.discounts(),
    queryFn: listDiscounts,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDiscount(discountId: string) {
  return useQuery({
    queryKey: billingKeys.discount(discountId),
    queryFn: () => getDiscount(discountId),
    enabled: !!discountId,
  });
}

// ─── Instalment Queries ───────────────────────────────────────────────────────

export function useInstalmentPlans(memberId?: string) {
  return useQuery({
    queryKey: billingKeys.instalmentList(memberId),
    queryFn: () => listInstalmentPlans(memberId),
    staleTime: 1000 * 30,
  });
}

export function useInstalmentPlan(planId: string) {
  return useQuery({
    queryKey: billingKeys.instalment(planId),
    queryFn: () => getInstalmentPlan(planId),
    enabled: !!planId,
  });
}

// ─── Invoice Mutations ────────────────────────────────────────────────────────

export function useCreateInvoice(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvoiceDto) => createInvoice(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Invoice created' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to create invoice', description: getErrorMessage(err) }),
  });
}

export function useUpdateInvoice(invoiceId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateInvoiceDto) => updateInvoice(invoiceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Invoice updated' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to update invoice', description: getErrorMessage(err) }),
  });
}

export function useIssueInvoice(invoiceId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssueInvoiceDto) => issueInvoice(invoiceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Invoice issued' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to issue invoice', description: getErrorMessage(err) }),
  });
}

export function useVoidInvoice(invoiceId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VoidInvoiceDto) => voidInvoice(invoiceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Invoice voided' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to void invoice', description: getErrorMessage(err) }),
  });
}

export function useApplyDiscount(invoiceId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyDiscountDto) => applyDiscount(invoiceId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoice(invoiceId) });
      toast({ title: 'Discount applied' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to apply discount', description: getErrorMessage(err) }),
  });
}

// ─── Payment Mutations ────────────────────────────────────────────────────────

export function useRecordPayment(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordPaymentDto) => recordPayment(body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: billingKeys.payments() });
      qc.invalidateQueries({ queryKey: billingKeys.invoice(vars.invoiceId) });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Payment recorded' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to record payment', description: getErrorMessage(err) }),
  });
}

export function useRefundPayment(paymentId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RefundPaymentDto) => refundPayment(paymentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.payments() });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Refund recorded' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to refund payment', description: getErrorMessage(err) }),
  });
}

// ─── Discount Mutations ───────────────────────────────────────────────────────

export function useCreateDiscount(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDiscountDto) => createDiscount(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.discounts() });
      toast({ title: 'Discount code created' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to create discount', description: getErrorMessage(err) }),
  });
}

export function useUpdateDiscount(discountId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDiscountDto) => updateDiscount(discountId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.discounts() });
      qc.invalidateQueries({ queryKey: billingKeys.discount(discountId) });
      toast({ title: 'Discount updated' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to update discount', description: getErrorMessage(err) }),
  });
}

export function useValidateDiscount() {
  return useMutation({
    mutationFn: (body: ValidateDiscountDto) => validateDiscount(body),
    onError: (err) => toast({ variant: 'destructive', title: 'Validation failed', description: getErrorMessage(err) }),
  });
}

// ─── Instalment Mutations ─────────────────────────────────────────────────────

export function useCreateInstalmentPlan(options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInstalmentPlanDto) => createInstalmentPlan(body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: billingKeys.instalments() });
      qc.invalidateQueries({ queryKey: billingKeys.invoice(
        typeof data.invoiceId === 'string' ? data.invoiceId : data.invoiceId._id
      ) });
      toast({ title: 'Instalment plan created' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to create instalment plan', description: getErrorMessage(err) }),
  });
}

export function useRecordInstalmentPayment(planId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordInstalmentPaymentDto) => recordInstalmentPayment(planId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.instalment(planId) });
      qc.invalidateQueries({ queryKey: billingKeys.instalments() });
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast({ title: 'Instalment payment recorded' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to record instalment payment', description: getErrorMessage(err) }),
  });
}

export function useCancelInstalmentPlan(planId: string, options?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => cancelInstalmentPlan(planId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.instalments() });
      qc.invalidateQueries({ queryKey: billingKeys.instalment(planId) });
      toast({ title: 'Instalment plan cancelled' });
      options?.onSuccess?.();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Failed to cancel plan', description: getErrorMessage(err) }),
  });
}
