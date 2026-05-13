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
  Percent,
  ClipboardList,
  BadgePercent,
  Receipt,
  TrendingDown,
  UserCog,
  TrendingUp, // ← Add this
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

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ─── Flat list (used by simple sidebar implementations) ───────────────────────

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
  // {
  //   to: '/staff',
  //   label: 'Staff',
  //   icon: UserCog,
  //   permission: 'role.read',
  // },
  {
    to: '/branches',
    label: 'Branches',
    icon: Building2,
    permission: 'branch.read',
  },
  {
    to: '/equipment',
    label: 'Equipment',
    icon: Package,
    permission: 'equipment.read',
  },
  {
    to: '/work-orders',
    label: 'Work Orders',
    icon: ClipboardList,
    permission: 'work_order.read',
  },
  {
    to: '/membership-plans',
    label: 'Membership Plans',
    icon: BadgePercent,
    permission: 'plan.read',
  },
  // ─── Billing Dashboard - ADD THIS ─────────────────────────────────────────
  {
    to: '/billing/dashboard',
    label: 'Billing Dashboard',
    icon: TrendingUp,
    permission: 'billing.dashboard.read',
  },
  {
    to: '/billing/invoices',
    label: 'Invoices',
    icon: CreditCard,
    permission: 'invoice.read',
  },
  {
    to: '/billing/discounts',
    label: 'Discounts',
    icon: Percent,
    permission: 'discount.read',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: Receipt,
    permission: 'expense.read',
  },
  {
    to: '/expense-analytics',
    label: 'Expense Analytics',
    icon: TrendingDown,
    permission: 'expense.read',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'report.read',
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

// ─── Grouped (used by grouped sidebar implementations) ────────────────────────

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Manage',
    items: [
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
      // {
      //   to: '/staff',
      //   label: 'Staff',
      //   icon: UserCog,
      //   permission: 'role.read',
      // },
      {
        to: '/branches',
        label: 'Branches',
        icon: Building2,
        permission: 'branch.read',
      },
      {
        to: '/equipment',
        label: 'Equipment',
        icon: Package,
        permission: 'equipment.read',
      },
      {
        to: '/work-orders',
        label: 'Work Orders',
        icon: ClipboardList,
        permission: 'work_order.read',
      },
      {
        to: '/membership-plans',
        label: 'Membership Plans',
        icon: BadgePercent,
        permission: 'plan.read',
      },
      // ─── Billing section - ADD THESE ─────────────────────────────────────
      {
        to: '/billing/dashboard',
        label: 'Billing Dashboard',
        icon: TrendingUp,
        permission: 'billing.dashboard.read',
      },
      {
        to: '/billing/invoices',
        label: 'Invoices',
        icon: CreditCard,
        permission: 'invoice.read',
      },
      {
        to: '/billing/discounts',
        label: 'Discounts',
        icon: Percent,
        permission: 'discount.read',
      },
      {
        to: '/expenses',
        label: 'Expenses',
        icon: Receipt,
        permission: 'expense.read',
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        to: '/reports',
        label: 'Reports',
        icon: BarChart3,
        permission: 'report.read',
      },
      {
        to: '/expense-analytics',
        label: 'Expense Analytics',
        icon: TrendingDown,
        permission: 'expense.read',
      },
    ],
  },
  {
    label: 'System',
    items: [
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
    ],
  },
];

// ─── Bottom nav (settings, super admin) ──────────────────────────────────────

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['gym_owner', 'branch_manager'],
  },
  {
    to: '/super-admin',
    label: 'Super Admin',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
];