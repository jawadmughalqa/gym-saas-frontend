import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { MembershipStatus, EquipmentStatus } from '@/types/api.types';
import type { SubscriptionStatus } from '@/types/member.types';
import type { InvoiceStatus, PaymentStatus, InstalmentPlanStatus } from '@/types/billing.types';

// ─── Variant maps ─────────────────────────────────────────────────────────────

const MEMBERSHIP_VARIANTS: Record<MembershipStatus, BadgeProps['variant']> = {
  active:    'success',
  inactive:  'secondary',
  suspended: 'warning',
  frozen:    'outline',
};

const SUBSCRIPTION_VARIANTS: Record<SubscriptionStatus, BadgeProps['variant']> = {
  active:          'success',
  pending_payment: 'warning',
  frozen:          'outline',
  expired:         'destructive',
  cancelled:       'secondary',
};

const INVOICE_VARIANTS: Record<InvoiceStatus, BadgeProps['variant']> = {
  draft:           'secondary',
  issued:          'default',
  partially_paid:  'warning',
  paid:            'success',
  overdue:         'destructive',
  void:            'outline',
  refunded:        'secondary',
};

const PAYMENT_VARIANTS: Record<PaymentStatus, BadgeProps['variant']> = {
  pending:            'warning',
  completed:          'success',
  failed:             'destructive',
  refunded:           'secondary',
  partially_refunded: 'outline',
};

const INSTALMENT_VARIANTS: Record<InstalmentPlanStatus, BadgeProps['variant']> = {
  active:    'success',
  completed: 'secondary',
  defaulted: 'destructive',
  cancelled: 'outline',
};

const EQUIPMENT_VARIANTS: Record<EquipmentStatus, BadgeProps['variant']> = {
  operational:     'success',
  maintenance:     'warning',
  out_of_service:  'destructive',
  retired:         'secondary',
};

// ─── Label maps ───────────────────────────────────────────────────────────────

const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  active:    'Active',
  inactive:  'Inactive',
  suspended: 'Suspended',
  frozen:    'Frozen',
};

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  active:          'Active',
  pending_payment: 'Pending Payment',
  frozen:          'Frozen',
  expired:         'Expired',
  cancelled:       'Cancelled',
};

const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  draft:           'Draft',
  issued:          'Issued',
  partially_paid:  'Partially Paid',
  paid:            'Paid',
  overdue:         'Overdue',
  void:            'Void',
  refunded:        'Refunded',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending:            'Pending',
  completed:          'Completed',
  failed:             'Failed',
  refunded:           'Refunded',
  partially_refunded: 'Partial Refund',
};

const INSTALMENT_LABELS: Record<InstalmentPlanStatus, string> = {
  active:    'Active',
  completed: 'Completed',
  defaulted: 'Defaulted',
  cancelled: 'Cancelled',
};

const EQUIPMENT_LABELS: Record<EquipmentStatus, string> = {
  operational:    'Operational',
  maintenance:    'Maintenance',
  out_of_service: 'Out of Service',
  retired:        'Retired',
};

// ─── Components ───────────────────────────────────────────────────────────────

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return <Badge variant={MEMBERSHIP_VARIANTS[status]}>{MEMBERSHIP_LABELS[status]}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={SUBSCRIPTION_VARIANTS[status]}>{SUBSCRIPTION_LABELS[status]}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={INVOICE_VARIANTS[status]}>{INVOICE_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANTS[status]}>{PAYMENT_LABELS[status]}</Badge>;
}

export function InstalmentPlanStatusBadge({ status }: { status: InstalmentPlanStatus }) {
  return <Badge variant={INSTALMENT_VARIANTS[status]}>{INSTALMENT_LABELS[status]}</Badge>;
}

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return <Badge variant={EQUIPMENT_VARIANTS[status]}>{EQUIPMENT_LABELS[status]}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const label = role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const variant: BadgeProps['variant'] =
    role === 'super_admin' ? 'destructive'
    : role === 'owner'     ? 'default'
    : role === 'manager'   ? 'secondary'
    : 'outline';
  return <Badge variant={variant}>{label}</Badge>;
}
