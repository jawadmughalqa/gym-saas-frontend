import { useAuthStore, selectRole } from '@/stores/auth.store';
import { hasPermission, hasAnyPermission, hasAllPermissions, type Permission } from '@/lib/permissions';

/**
 * Returns permission-check helpers scoped to the current user's role.
 *
 * Usage:
 *   const { can, canAny, canAll } = usePermission();
 *   if (can('member.create')) { ... }
 */
export function usePermission() {
  const role = useAuthStore(selectRole);

  return {
    can: (permission: Permission) =>
      role ? hasPermission(role, permission) : false,

    canAny: (permissions: Permission[]) =>
      role ? hasAnyPermission(role, permissions) : false,

    canAll: (permissions: Permission[]) =>
      role ? hasAllPermissions(role, permissions) : false,

    role,
  };
}
