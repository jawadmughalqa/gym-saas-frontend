import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Package,
  CreditCard,
  BarChart3,
  Building2,
  Bell,
  Settings,
  ShieldCheck,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api.types';
import type { Permission } from '@/lib/permissions';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** If set, user must have this permission to see this item */
  permission?: Permission;
  /** If set, only these roles see this item */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/members',
    label: 'Members',
    icon: Users,
    permission: 'member.read',
  },
  {
    to: '/trainers',
    label: 'Trainers',
    icon: Dumbbell,
    permission: 'trainer.read',
  },
  {
    to: '/equipment',
    label: 'Equipment',
    icon: Package,
    permission: 'equipment.read',
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: CreditCard,
    permission: 'invoice.read',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'report.read',
  },
  {
    to: '/branches',
    label: 'Branches',
    icon: Building2,
    permission: 'branch.read',
  },
  {
    to: '/notifications',
    label: 'Notifications',
    icon: Bell,
    permission: 'notification.read',
  },
  {
    to: '/roles',
    label: 'Roles',
    icon: Shield,
    permission: 'role.read',
  },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['owner', 'manager'],
  },
  {
    to: '/super-admin',
    label: 'Super Admin',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
];
