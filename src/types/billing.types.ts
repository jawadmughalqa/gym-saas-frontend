import type { PaginationMeta } from './api.types';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'refunded';

export type LineItemType =
  | 'subscription'
  | 'personal_training'
  | 'product'
  | 'late_fee'
  | 'addon'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'online'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type DiscountType = 'percentage' | 'fixed_amount';
export type DiscountScope = 'invoice' | 'line_item' | 'both';
export type InstalmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type InstalmentEntryStatus = 'pending' | 'paid' | 'overdue' | 'waived';

// ─── Sub-objects ──────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  total?: number;
  subscriptionId?: string;
  planSnapshotName?: string;
}

export interface InvoiceMemberRef {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface InvoiceRef {
  _id: string;
  invoiceNumber: string;
  total: number;
}

export interface RefundRecord {
  _id: string;
  amount: number;
  reason: string;
  refundedAt: string;
  refundedBy: string;
  gatewayRefundId?: string;
}

export interface InstalmentScheduleEntry {
  _id: string;
  instalmentNumber: number;
  dueDate: string;
  amount: number;
  status: InstalmentEntryStatus;
  paymentId?: string;
  paidAt?: string;
  paidAmount?: number;
}

// ─── Main entities ────────────────────────────────────────────────────────────

export interface Invoice {
  _id: string;
  tenantId: string;
  branchId: string;
  memberId: InvoiceMemberRef;
  invoiceNumber: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  discountCode?: string;
  invoiceLevelDiscountAmount?: number;
  dueDate?: string;
  issuedAt?: string;
  paidAt?: string;
  memo?: string;
  notes?: string;
  instalmentPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  tenantId: string;
  branchId: string;
  memberId: InvoiceMemberRef;
  invoiceId: InvoiceRef;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  gatewayTransactionId?: string;
  paidAt: string;
  refunds: RefundRecord[];
  totalRefunded: number;
  netAmount: number;
  notes?: string;
  createdAt: string;
}

export interface Discount {
  _id: string;
  tenantId: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  scope: DiscountScope;
  minInvoiceAmount?: number;
  maxUsageCount?: number;
  usageCount: number;
  maxUsagePerMember?: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}

export interface InstalmentPlan {
  _id: string;
  tenantId: string;
  memberId: InvoiceMemberRef;
  invoiceId: InvoiceRef;
  status: InstalmentPlanStatus;
  totalAmount: number;
  currency: string;
  numberOfInstalments: number;
  instalmentAmount: number;
  frequencyDays: number;
  schedule: InstalmentScheduleEntry[];
  totalPaid: number;
  remainingAmount: number;
  downPayment: number;
  startDate: string;
  completedAt?: string;
  createdAt: string;
}

// ─── List responses ───────────────────────────────────────────────────────────

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: PaginationMeta;
}

export interface PaymentListResponse {
  payments: Payment[];
  pagination: PaginationMeta;
}

export interface DiscountListResponse {
  discounts: Discount[];
}

export interface InstalmentListResponse {
  plans: InstalmentPlan[];
}

// ─── Query types ──────────────────────────────────────────────────────────────

export interface ListInvoicesQuery {
  page?: number;
  limit?: number;
  memberId?: string;
  branchId?: string;
  status?: InvoiceStatus;
  overdueOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  memberId?: string;
  branchId?: string;
  invoiceId?: string;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateLineItemDto {
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  subscriptionId?: string;
  planSnapshotName?: string;
}

export interface CreateInvoiceDto {
  memberId: string;
  branchId: string;
  lineItems: CreateLineItemDto[];
  currency?: string;
  dueDate?: string;
  discountCode?: string;
  invoiceLevelDiscountAmount?: number;
  memo?: string;
  notes?: string;
  issueImmediately?: boolean;
}

export interface UpdateInvoiceDto {
  lineItems?: CreateLineItemDto[];
  dueDate?: string;
  memo?: string;
  notes?: string;
}

export interface IssueInvoiceDto {
  dueDate?: string;
  memo?: string;
}

export interface VoidInvoiceDto {
  reason: string;
}

export interface ApplyDiscountDto {
  discountCode: string;
}

export interface RecordPaymentDto {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  reference?: string;
  gatewayTransactionId?: string;
  gatewayProvider?: string;
  instalmentId?: string;
  notes?: string;
}

export interface RefundPaymentDto {
  amount: number;
  reason: string;
  gatewayRefundId?: string;
}

export interface CreateDiscountDto {
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  scope?: DiscountScope;
  minInvoiceAmount?: number;
  maxUsageCount?: number;
  maxUsagePerMember?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface UpdateDiscountDto {
  description?: string;
  value?: number;
  maxUsageCount?: number;
  maxUsagePerMember?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  minInvoiceAmount?: number;
}

export interface ValidateDiscountDto {
  code: string;
  invoiceAmount: number;
  memberId: string;
}

export interface ValidateDiscountResult {
  valid: boolean;
  discountAmount: number;
  error?: string;
  discount?: Discount;
}

export interface CreateInstalmentPlanDto {
  invoiceId: string;
  numberOfInstalments: number;
  frequencyDays: number;
  downPayment?: number;
  startDate?: string;
  notes?: string;
}

export interface RecordInstalmentPaymentDto {
  instalmentNumber: number;
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  reference?: string;
  notes?: string;
}
