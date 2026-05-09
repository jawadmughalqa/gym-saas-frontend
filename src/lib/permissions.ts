import type { UserRole } from '@/types/api.types';

/**
 * Permission strings mirror the backend PERMISSIONS constant.
 * Format: "<resource>.<action>"
 */
export type Permission =
  // Tenant
  | 'tenant.read' | 'tenant.update'
  // Branch
  | 'branch.create' | 'branch.read' | 'branch.update' | 'branch.delete'
  // Member
  | 'member.create' | 'member.read' | 'member.update' | 'member.delete'
  // Subscription
  | 'subscription.create' | 'subscription.read' | 'subscription.update' | 'subscription.cancel'
  // Trainer
  | 'trainer.create' | 'trainer.read' | 'trainer.update' | 'trainer.delete'
  | 'trainer.assign' | 'trainer.rate'
  // Equipment
  | 'equipment.create' | 'equipment.read' | 'equipment.update' | 'equipment.delete'
  | 'equipment.maintenance'
  // Billing
  | 'invoice.create' | 'invoice.read' | 'invoice.update'
  | 'payment.create' | 'payment.read'
  | 'discount.create' | 'discount.read' | 'discount.update' | 'discount.delete'
  // Report
  | 'report.read'
  // Role
  | 'role.create' | 'role.read' | 'role.update' | 'role.delete'
  // User / staff
  | 'user.create' | 'user.read' | 'user.update' | 'user.delete'
  // Notification
  | 'notification.read';

/**
 * Role-to-permission map.
 * super_admin bypasses all checks (handled separately).
 * owner  = full gym access
 * manager = operational access, no billing delete / role management
 * trainer = own data + assigned member data only
 * receptionist = front-desk access
 * member  = self-service only
 */
const ROLE_PERMISSIONS: Record<Exclude<UserRole, 'super_admin'>, Permission[]> = {
  owner: [
    'tenant.read', 'tenant.update',
    'branch.create', 'branch.read', 'branch.update', 'branch.delete',
    'member.create', 'member.read', 'member.update', 'member.delete',
    'subscription.create', 'subscription.read', 'subscription.update', 'subscription.cancel',
    'trainer.create', 'trainer.read', 'trainer.update', 'trainer.delete', 'trainer.assign', 'trainer.rate',
    'equipment.create', 'equipment.read', 'equipment.update', 'equipment.delete', 'equipment.maintenance',
    'invoice.create', 'invoice.read', 'invoice.update',
    'payment.create', 'payment.read',
    'discount.create', 'discount.read', 'discount.update', 'discount.delete',
    'report.read',
    'role.create', 'role.read', 'role.update', 'role.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'notification.read',
  ],
  manager: [
    'branch.read', 'branch.update',
    'member.create', 'member.read', 'member.update',
    'subscription.create', 'subscription.read', 'subscription.update', 'subscription.cancel',
    'trainer.read', 'trainer.assign', 'trainer.rate',
    'equipment.read', 'equipment.update', 'equipment.maintenance',
    'invoice.create', 'invoice.read',
    'payment.create', 'payment.read',
    'discount.read',
    'report.read',
    'role.read',
    'user.read',
    'notification.read',
  ],
  trainer: [
    'member.read',
    'subscription.read',
    'trainer.read',
    'equipment.read',
    'notification.read',
  ],
  receptionist: [
    'member.create', 'member.read', 'member.update',
    'subscription.read',
    'invoice.read',
    'payment.create', 'payment.read',
    'notification.read',
  ],
  member: [
    'subscription.read',
    'invoice.read',
    'payment.read',
    'notification.read',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
