import type { UserRole } from '@/types/api.types';

/**
 * Permission strings — single source of truth for frontend RBAC.
 * Must stay in sync with backend PERMISSIONS constant.
 * Format: "<resource>.<action>"
 */
export type Permission =
  // ── Tenant / Super Admin ──────────────────────────────────────────────────
  | 'tenant.create'
  | 'tenant.read'
  | 'tenant.update'
  | 'tenant.suspend'
  | 'tenant.terminate'
  | 'tenant.impersonate'

  // ── SaaS Plans ────────────────────────────────────────────────────────────
  | 'plan.create'
  | 'plan.read'
  | 'plan.update'

  // ── Membership Plans (gym-level) ──────────────────────────────────────────
  | 'plan.read'      // list / get
  | 'plan.create'    // create
  | 'plan.update'    // edit
  | 'plan.archive'   // soft-delete

  // ── Branch ────────────────────────────────────────────────────────────────
  | 'branch.create'
  | 'branch.read'
  | 'branch.update'
  | 'branch.archive'

  // ── Roles ─────────────────────────────────────────────────────────────────
  | 'role.create'
  | 'role.read'
  | 'role.update'
  | 'role.delete'
  | 'role.assign'

  // ── Members ───────────────────────────────────────────────────────────────
  | 'member.create'
  | 'member.read'
  | 'member.update'
  | 'member.delete'

  // ── Subscriptions ─────────────────────────────────────────────────────────
  | 'subscription.create'
  | 'subscription.read'
  | 'subscription.update'
  | 'subscription.cancel'
  | 'subscription.freeze'

  // ── Check-in ──────────────────────────────────────────────────────────────
  | 'checkin.create'
  | 'checkin.read'

  // ── Trainers ──────────────────────────────────────────────────────────────
  | 'trainer.create'
  | 'trainer.read'
  | 'trainer.update'
  | 'trainer.assign'

  // ── Training Notes ────────────────────────────────────────────────────────
  | 'training_note.create'
  | 'training_note.read'

  // ── Equipment ─────────────────────────────────────────────────────────────
  | 'equipment.create'
  | 'equipment.read'
  | 'equipment.update'
  | 'equipment.maintenance.create'
  | 'equipment.maintenance.update'

  // ── Work Orders ───────────────────────────────────────────────────────────
  | 'work_order.create'
  | 'work_order.read'
  | 'work_order.update'

  // ── Invoices ──────────────────────────────────────────────────────────────
  | 'invoice.create'
  | 'invoice.read'
  | 'invoice.void'
  | 'invoice.pdf'

  // ── Payments ──────────────────────────────────────────────────────────────
  | 'payment.create'
  | 'payment.read'
  | 'payment.refund'
  | 'payment.discount.override'

  // ── Discounts ─────────────────────────────────────────────────────────────
  | 'discount.create'
  | 'discount.read'
  | 'discount.update'
  | 'discount.delete'
  | 'discount.apply'

  // ── Instalment Plans ──────────────────────────────────────────────────────
  | 'instalment.create'
  | 'instalment.read'
  | 'instalment.update'

  // ── Notifications ─────────────────────────────────────────────────────────
  | 'notification.read'
  | 'notification.template.manage'

  // ── Reports ───────────────────────────────────────────────────────────────
  | 'report.read'
  | 'report.export'

  // ── Expenses ──────────────────────────────────────────────────────────────
  | 'expense.create'
  | 'expense.read'
  | 'expense.update'
  | 'expense.delete'

  // ─── Billing Dashboard ────────────────────────────────────────────────────
  | 'billing.dashboard.read'
  | 'billing.transactions.read';

// ─── Role → Permission map ────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Exclude<UserRole, 'super_admin'>, Permission[]> = {

  gym_owner: [
    // Branch
    'branch.create', 'branch.read', 'branch.update', 'branch.archive',
    // Roles
    'role.create', 'role.read', 'role.update', 'role.delete', 'role.assign',
    // Members
    'member.create', 'member.read', 'member.update', 'member.delete',
    // Subscriptions
    'subscription.create', 'subscription.read', 'subscription.update',
    'subscription.cancel', 'subscription.freeze',
    // Check-in
    'checkin.create', 'checkin.read',
    // Trainers
    'trainer.create', 'trainer.read', 'trainer.update', 'trainer.assign',
    // Training notes
    'training_note.create', 'training_note.read',
    // Equipment
    'equipment.create', 'equipment.read', 'equipment.update',
    'equipment.maintenance.create', 'equipment.maintenance.update',
    // Work orders
    'work_order.create', 'work_order.read', 'work_order.update',
    // Invoices
    'invoice.create', 'invoice.read', 'invoice.void', 'invoice.pdf',
    // Payments
    'payment.create', 'payment.read', 'payment.refund', 'payment.discount.override',
    // Discounts
    'discount.create', 'discount.read', 'discount.update', 'discount.delete', 'discount.apply',
    // Instalments
    'instalment.create', 'instalment.read', 'instalment.update',
    // Notifications
    'notification.read', 'notification.template.manage',
    // Reports
    'report.read', 'report.export',
    // Membership plans
    'plan.read', 'plan.create', 'plan.update', 'plan.archive',
    // Expenses — full access
    'expense.create', 'expense.read', 'expense.update', 'expense.delete',
    // Billing Dashboard — full access
    'billing.dashboard.read', 'billing.transactions.read',
  ],

  branch_manager: [
    // Branch
    'branch.read',
    // Roles
    'role.read',
    // Members
    'member.create', 'member.read', 'member.update',
    // Subscriptions
    'subscription.create', 'subscription.read', 'subscription.update',
    'subscription.cancel', 'subscription.freeze',
    // Check-in
    'checkin.create', 'checkin.read',
    // Trainers
    'trainer.create', 'trainer.read', 'trainer.update', 'trainer.assign',
    // Training notes
    'training_note.read',
    // Equipment
    'equipment.create', 'equipment.read', 'equipment.update',
    'equipment.maintenance.create', 'equipment.maintenance.update',
    // Work orders
    'work_order.create', 'work_order.read', 'work_order.update',
    // Invoices
    'invoice.create', 'invoice.read', 'invoice.void', 'invoice.pdf',
    // Payments
    'payment.create', 'payment.read', 'payment.refund', 'payment.discount.override',
    // Discounts
    'discount.read', 'discount.apply',
    // Instalments
    'instalment.create', 'instalment.read', 'instalment.update',
    // Notifications
    'notification.read',
    // Reports
    'report.read', 'report.export',
    // Membership plans — read only for branch managers
    'plan.read',
    // Expenses — create, read, update (no delete)
    'expense.create', 'expense.read', 'expense.update',
    // Billing Dashboard — read access
    'billing.dashboard.read', 'billing.transactions.read',
  ],

  staff: [
    // Members
    'member.create', 'member.read', 'member.update',
    // Subscriptions
    'subscription.create', 'subscription.read',
    // Check-in
    'checkin.create', 'checkin.read',
    // Trainers
    'trainer.read', 'trainer.assign',
    // Equipment
    'equipment.read',
    // Work orders
    'work_order.create', 'work_order.read',
    // Invoices
    'invoice.create', 'invoice.read', 'invoice.pdf',
    // Payments
    'payment.create', 'payment.read',
    // Discounts
    'discount.read', 'discount.apply',
    // Instalments
    'instalment.read',
    // Notifications
    'notification.read',
    // Membership plans — read only for staff
    'plan.read',
    // Expenses — read only for staff
    'expense.read',
    // Billing Dashboard — read access for staff
    'billing.dashboard.read', 'billing.transactions.read',
  ],

  trainer: [
    // Members — own assigned members only (enforced in service layer)
    'member.read',
    // Trainers
    'trainer.read',
    // Training notes
    'training_note.create', 'training_note.read',
    // Notifications
    'notification.read',
    // Trainers can view billing dashboard (read only)
    'billing.dashboard.read',
  ],

  member: [
    // Notifications
    'notification.read',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  return (ROLE_PERMISSIONS[role as Exclude<UserRole, 'super_admin'>] ?? []).includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}