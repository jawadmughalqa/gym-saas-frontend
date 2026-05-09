import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import NotFoundPage from '@/components/shared/NotFoundPage';
import UnauthorizedPage from '@/components/shared/UnauthorizedPage';
import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';

// ─── Lazy pages ────────────────────────────────────────────────────────────────

const ChangePasswordPage  = lazy(() => import('@/features/auth/ChangePasswordPage'));
const MembersPage         = lazy(() => import('@/features/members/MembersPage'));
const MemberDetailPage    = lazy(() => import('@/features/members/MemberDetailPage'));
const InvoicesPage        = lazy(() => import('@/features/billing/InvoicesPage'));
const InvoiceDetailPage   = lazy(() => import('@/features/billing/InvoiceDetailPage'));
const DiscountsPage       = lazy(() => import('@/features/billing/DiscountsPage'));
const TrainersPage        = lazy(() => import('@/features/trainers/TrainersPage'));
const TrainerDetailPage   = lazy(() => import('@/features/trainers/TrainerDetailPage'));
const EquipmentPage       = lazy(() => import('@/features/equipment/EquipmentPage'));
const EquipmentDetailPage = lazy(() => import('@/features/equipment/EquipmentDetailPage'));
const WorkOrdersPage      = lazy(() => import('@/features/equipment/WorkOrdersPage'));
const ReportsPage         = lazy(() => import('@/features/reports/ReportsPage'));
const NotificationsPage   = lazy(() => import('@/features/notifications/NotificationsPage'));
const BranchesPage        = lazy(() => import('@/features/branches/BranchesPage'));
const BranchDetailPage    = lazy(() => import('@/features/branches/BranchDetailPage'));
const RolesPage           = lazy(() => import('@/features/roles/RolesPage'));
const SuperAdminPage      = lazy(() => import('@/features/super-admin/SuperAdminPage'));
const TenantDetailPage    = lazy(() => import('@/features/super-admin/TenantDetailPage'));
const PlansPage           = lazy(() => import('@/features/super-admin/PlansPage'));

// Uncomment as each phase is built:
const BillingPage       = lazy(() => import('@/features/billing/InvoicesPage'));
// const ReportsPage       = lazy(() => import('@/features/reports/ReportsPage'));
// const BranchesPage      = lazy(() => import('@/features/branches/BranchesPage'));
// const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
// const SettingsPage      = lazy(() => import('@/features/settings/SettingsPage'));

// ─── Suspense wrapper ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = createBrowserRouter([

  // ── Public ────────────────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },

  // ── Protected shell ───────────────────────────────────────────────────────
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Root redirect
          { index: true, element: <Navigate to="/dashboard" replace /> },

          // Dashboard
          {
            path: 'dashboard',
            element: <DashboardPage />,
            handle: { crumb: 'Dashboard' },
          },

          // ── Auth self-service ──────────────────────────────────────────
          {
            path: 'settings',
            handle: { crumb: 'Settings' },
            children: [
              {
                path: 'change-password',
                element: <Lazy><ChangePasswordPage /></Lazy>,
                handle: { crumb: 'Change Password' },
              },
            ],
          },

          // ── Feature routes ────────────────────────────────────────────
          {
            path: 'members',
            handle: { crumb: 'Members' },
            children: [
              { index: true, element: <Lazy><MembersPage /></Lazy> },
              {
                path: ':memberId',
                element: <Lazy><MemberDetailPage /></Lazy>,
                handle: { crumb: 'Member Detail' },
              },
            ],
          },
          {
            path: 'billing',
            handle: { crumb: 'Billing' },
            children: [
              { index: true, element: <Lazy><InvoicesPage /></Lazy> },
              {
                path: ':invoiceId',
                element: <Lazy><InvoiceDetailPage /></Lazy>,
                handle: { crumb: 'Invoice' },
              },
            ],
          },
          {
            path: 'discounts',
            element: <Lazy><DiscountsPage /></Lazy>,
            handle: { crumb: 'Discounts' },
          },
          {
            path: 'trainers',
            handle: { crumb: 'Trainers' },
            children: [
              { index: true, element: <Lazy><TrainersPage /></Lazy> },
              {
                path: ':trainerId',
                element: <Lazy><TrainerDetailPage /></Lazy>,
                handle: { crumb: 'Trainer Detail' },
              },
            ],
          },
          {
            path: 'equipment',
            handle: { crumb: 'Equipment' },
            children: [
              { index: true, element: <Lazy><EquipmentPage /></Lazy> },
              {
                path: ':equipmentId',
                element: <Lazy><EquipmentDetailPage /></Lazy>,
                handle: { crumb: 'Equipment Detail' },
              },
            ],
          },
          {
            path: 'work-orders',
            element: <Lazy><WorkOrdersPage /></Lazy>,
            handle: { crumb: 'Work Orders' },
          },
          {
            path: 'reports',
            element: <Lazy><ReportsPage /></Lazy>,
            handle: { crumb: 'Reports' },
          },
          {
            path: 'notifications',
            element: <Lazy><NotificationsPage /></Lazy>,
            handle: { crumb: 'Notifications' },
          },
          {
            path: 'branches',
            handle: { crumb: 'Branches' },
            children: [
              { index: true, element: <Lazy><BranchesPage /></Lazy> },
              {
                path: ':branchId',
                element: <Lazy><BranchDetailPage /></Lazy>,
                handle: { crumb: 'Branch Detail' },
              },
            ],
          },
          {
            path: 'roles',
            element: <Lazy><RolesPage /></Lazy>,
            handle: { crumb: 'Roles & Permissions' },
          },
          {
            path: 'equipment',
            handle: { crumb: 'Equipment' },
            children: [
              { index: true, element: <Lazy><EquipmentPage /></Lazy> },
            ],
          },
          {
            path: 'billing',
            handle: { crumb: 'Billing' },
            children: [
              { index: true, element: <Lazy><BillingPage /></Lazy> },
            ],
          },
          {
            path: 'reports',
            handle: { crumb: 'Reports' },
            children: [
              { index: true, element: <Lazy><ReportsPage /></Lazy> },
            ],
          },
          {
            path: 'branches',
            handle: { crumb: 'Branches' },
            children: [
              { index: true, element: <Lazy><BranchesPage /></Lazy> },
            ],
          },
          {
            path: 'notifications',
            element: <Lazy><NotificationsPage /></Lazy>,
            handle: { crumb: 'Notifications' },
          },
          // {
          //   path: 'settings',
          //   handle: { crumb: 'Settings' },
          //   children: [
          //     { index: true, element: <Lazy><SettingsPage /></Lazy> },
          //     { path: 'change-password', element: <Lazy><ChangePasswordPage /></Lazy>, handle: { crumb: 'Change Password' } },
          //   ],
          // },
        ],
      },
    ],
  },

  // ── Super Admin (role-gated, shares AppShell) ─────────────────────────────
  {
    path: '/super-admin',
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Lazy><SuperAdminPage /></Lazy>,
            handle: { crumb: 'Super Admin' },
          },
          {
            path: 'tenants/:tenantId',
            element: <Lazy><TenantDetailPage /></Lazy>,
            handle: { crumb: 'Tenant Detail' },
          },
          {
            path: 'plans',
            element: <Lazy><PlansPage /></Lazy>,
            handle: { crumb: 'Plans' },
          },
        ],
      },
    ],
  },

  // ── Error pages ───────────────────────────────────────────────────────────
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default router;
