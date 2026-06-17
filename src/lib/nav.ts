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
  TrendingUp,
  RotateCcw,
  Home,
  BadgeCheck,
  ClipboardCheck,
  Flame,
  Inbox,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api.types';
import type { Permission } from '@/lib/permissions';
import type { PlanFeatureKey } from '@/hooks/use-plan-features';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** If set, user must have this permission to see this item */
  permission?: Permission;
  /** If set, only these roles see this item */
  roles?: UserRole[];
  /** If set, this nav item is hidden when the tenant's plan doesn't include this feature */
  featureFlag?: PlanFeatureKey;
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
  {
    to: '/staff',
    label: 'Staff',
    icon: UserCog,
    permission: 'role.read',
  },
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
  // {
  //   to: '/work-orders',
  //   label: 'Work Orders',
  //   icon: ClipboardList,
  //   permission: 'work_order.read',
  // },
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
    to: '/refunds',
    label: 'Refunds',
    icon: RotateCcw,
    permission: 'payment.refund',
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
  // {
  //   to: '/roles',
  //   label: 'Roles',
  //   icon: Shield,
  //   permission: 'role.read',
  // },
];

// ─── Grouped (used by grouped sidebar implementations) ────────────────────────

// ─── Role sets (reused across groups) ────────────────────────────────────────

const ADMIN_ROLES: UserRole[] = ['super_admin', 'gym_owner', 'branch_manager', 'staff'];

export const NAV_GROUPS: NavGroup[] = [
  // ── Member portal (member role only) ──────────────────────────────────────
  {
    label: 'My Account',
    items: [
      { to: '/member/home',         label: 'Home',       icon: Home,       roles: ['member'], featureFlag: 'memberPortal' },
      { to: '/member/plan',         label: 'My Plan',    icon: BadgeCheck, roles: ['member'], featureFlag: 'memberPortal' },
      { to: '/member/fit-plan',     label: 'FitPlan',    icon: Flame,      roles: ['member'], featureFlag: 'fitPlan'      },
      { to: '/member/invoices',     label: 'Invoices',   icon: Receipt,    roles: ['member'], featureFlag: 'memberPortal' },
      { to: '/member/trainer',      label: 'My Trainer', icon: Dumbbell,   roles: ['member'], featureFlag: 'memberPortal' },
    ],
  },

  // ── Trainer workspace (trainer role only) ─────────────────────────────────
  {
    label: 'My Workspace',
    items: [
      {
        to: '/trainer/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['trainer'],
        featureFlag: 'trainers',
      },
      {
        to: '/trainer/clients',
        label: 'My Clients',
        icon: Users,
        roles: ['trainer'],
        featureFlag: 'trainers',
      },
      {
        to: '/trainer/notes',
        label: 'Training Notes',
        icon: ClipboardCheck,
        roles: ['trainer'],
        featureFlag: 'trainers',
      },
      {
        to: '/notifications',
        label: 'Notifications',
        icon: Bell,
        roles: ['trainer'],
        permission: 'notification.read',
        featureFlag: 'notifications',
      },
    ],
  },

  // ── Admin overview (admin roles only) ─────────────────────────────────────
  {
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ── Manage (admin roles only) ─────────────────────────────────────────────
  {
    label: 'Manage',
    items: [
      {
        to: '/members',
        label: 'Members',
        icon: Users,
        permission: 'member.read',
        roles: ADMIN_ROLES,
        featureFlag: 'members',
      },
      {
        to: '/trainers',
        label: 'Trainers',
        icon: Dumbbell,
        permission: 'trainer.read',
        roles: ADMIN_ROLES,
        featureFlag: 'trainers',
      },
      {
        to: '/staff',
        label: 'Staff',
        icon: UserCog,
        permission: 'role.read',
        roles: ADMIN_ROLES,
      },
      {
        to: '/branches',
        label: 'Branches',
        icon: Building2,
        permission: 'branch.read',
        // Branch managers oversee one branch — they don't need cross-branch management view
        roles: ['super_admin', 'gym_owner'],
        featureFlag: 'branches',
      },
      {
        to: '/equipment',
        label: 'Equipment',
        icon: Package,
        permission: 'equipment.read',
        roles: ADMIN_ROLES,
        featureFlag: 'equipment',
      },
      {
        to: '/membership-plans',
        label: 'Membership Plans',
        icon: BadgePercent,
        permission: 'plan.read',
        roles: ADMIN_ROLES,
        featureFlag: 'billing',
      },
      {
        to: '/billing/dashboard',
        label: 'Billing Dashboard',
        icon: TrendingUp,
        permission: 'billing.dashboard.read',
        roles: ADMIN_ROLES,
        featureFlag: 'billing',
      },
      {
        to: '/billing/invoices',
        label: 'Invoices',
        icon: CreditCard,
        permission: 'invoice.read',
        roles: ADMIN_ROLES,
        featureFlag: 'billing',
      },
      {
        to: '/billing/discounts',
        label: 'Discounts',
        icon: Percent,
        permission: 'discount.read',
        roles: ADMIN_ROLES,
        featureFlag: 'discounts',
      },
      {
        to: '/walk-in-leads',
        label: 'Walk-in Leads',
        icon: UserPlus,
        permission: 'walkin_lead.read',
        roles: ADMIN_ROLES,
        featureFlag: 'walkInLeads',
      },
      {
        to: '/expenses',
        label: 'Expenses',
        icon: Receipt,
        permission: 'expense.read',
        roles: ADMIN_ROLES,
        featureFlag: 'expenses',
      },
      {
        to: '/refunds',
        label: 'Refunds',
        icon: RotateCcw,
        permission: 'payment.refund',
        roles: ADMIN_ROLES,
        featureFlag: 'billing',
      },
    ],
  },

  // ── Insights (admin roles only) ───────────────────────────────────────────
  {
    label: 'Insights',
    items: [
      {
        to: '/reports',
        label: 'Reports',
        icon: BarChart3,
        permission: 'report.read',
        roles: ADMIN_ROLES,
        featureFlag: 'reports',
      },
      {
        to: '/expense-analytics',
        label: 'Expense Analytics',
        icon: TrendingDown,
        permission: 'expense.read',
        roles: ADMIN_ROLES,
        featureFlag: 'expenses',
      },
    ],
  },

  // ── System (admin roles only) ─────────────────────────────────────────────
  {
    label: 'System',
    items: [
      {
        to: '/notifications',
        label: 'Notifications',
        icon: Bell,
        permission: 'notification.read',
        roles: ADMIN_ROLES,
      },
    ],
  },
];

// ─── Bottom nav (settings, super admin) ──────────────────────────────────────

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  // {
  //   to: '/settings',
  //   label: 'Settings',
  //   icon: Settings,
  //   roles: ['gym_owner', 'branch_manager'],
  // },
  {
    to: '/super-admin/leads',
    label: 'Leads',
    icon: Inbox,
    roles: ['super_admin'],
  },
  {
    to: '/super-admin',
    label: 'Super Admin',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
];