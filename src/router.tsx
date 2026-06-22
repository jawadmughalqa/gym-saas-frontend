import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import NotFoundPage from "@/components/shared/NotFoundPage";
import UnauthorizedPage from "@/components/shared/UnauthorizedPage";
import LoginPage from "@/features/auth/LoginPage";
import RootRedirect from "@/features/auth/RootRedirect";
import DashboardPage from "@/features/dashboard/DashboardPage";
import FeatureRoute from "@/components/shared/FeatureRoute";

// ─── Lazy pages ───────────────────────────────────────────────────────────────

const ChangePasswordPage  = lazy(() => import("@/features/auth/ChangePasswordPage"));
const PricingPage         = lazy(() => import("@/features/settings/PricingPage"));
const BackupPage          = lazy(() => import("@/features/settings/BackupPage"));
const ProfilePage         = lazy(() => import("@/features/auth/ProfilePage"));
const MembersPage         = lazy(() => import("@/features/members/MembersPage"));
const MemberDetailPage    = lazy(() => import("@/features/members/MemberDetailPage"));
const InvoicesPage        = lazy(() => import("@/features/billing/InvoicesPage"));
const InvoiceDetailPage   = lazy(() => import("@/features/billing/InvoiceDetailPage"));
const BillingDashboard    = lazy(() => import("@/features/billing/BillingDashboard")); // ← ADD THIS
const DiscountsPage       = lazy(() => import("@/features/billing/DiscountsPage"));
const TrainersPage        = lazy(() => import("@/features/trainers/TrainersPage"));
const TrainerDetailPage   = lazy(() => import("@/features/trainers/TrainerDetailPage"));
const EquipmentPage       = lazy(() => import("@/features/equipment/EquipmentPage"));
const EquipmentDetailPage = lazy(() => import("@/features/equipment/EquipmentDetailPage"));
const WorkOrdersPage      = lazy(() => import("@/features/equipment/WorkOrdersPage"));
const ReportsPage         = lazy(() => import("@/features/reports/ReportsPage"));
const NotificationsPage   = lazy(() => import("@/features/notifications/NotificationsPage"));
const BranchesPage        = lazy(() => import("@/features/branches/BranchesPage"));
const BranchDetailPage    = lazy(() => import("@/features/branches/BranchDetailPage"));
const RolesPage           = lazy(() => import("@/features/roles/RolesPage"));
const SuperAdminPage      = lazy(() => import("@/features/super-admin/SuperAdminPage"));
const TenantDetailPage    = lazy(() => import("@/features/super-admin/TenantDetailPage"));
const PlansPage           = lazy(() => import("@/features/super-admin/PlansPage"));
const LeadsPage           = lazy(() => import("@/features/super-admin/LeadsPage"));
const MembershipPlansPage   = lazy(() => import("@/features/membership-plans/MembershipPlansPage"));
const ExpensesPage          = lazy(() => import("@/features/expenses/ExpensesPage"));
const ExpenseAnalyticsPage  = lazy(() => import("@/features/expenses/ExpenseAnalyticsPage"));
const StaffPage             = lazy(() => import("@/features/staff/StaffPage"));
const StaffDetailPage       = lazy(() => import("@/features/staff/StaffDetailPage"));
const WalkInLeadsPage       = lazy(() => import("@/features/walk-in-leads/WalkInLeadsPage"));
const RefundsPage           = lazy(() => import("@/features/refunds/RefundsPage"));
const MemberHomePage          = lazy(() => import("@/features/member-portal/MemberHomePage"));
const MemberPlanPage          = lazy(() => import("@/features/member-portal/MemberPlanPage"));
const MemberInvoicesPage      = lazy(() => import("@/features/member-portal/MemberInvoicesPage"));
const MemberTrainerPage       = lazy(() => import("@/features/member-portal/MemberTrainerPage"));
const FitPlanPage             = lazy(() => import("@/features/fit-plan/FitPlanPage"));
const FitPlanProgressPage     = lazy(() => import("@/features/fit-plan/ProgressPage"));
const FitPlanHistoryPage      = lazy(() => import("@/features/fit-plan/PlanHistoryPage"));
const TrainerDashboardPage    = lazy(() => import("@/features/trainer-portal/TrainerDashboardPage"));
const TrainerClientsPage      = lazy(() => import("@/features/trainer-portal/TrainerClientsPage"));
const TrainerNotesPage        = lazy(() => import("@/features/trainer-portal/TrainerNotesPage"));


// ─── Suspense wrapper ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
    path: "/login",
    element: <LoginPage />,
  },

  // ── Protected shell ───────────────────────────────────────────────────────
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [

          // Root redirect — members go to /member/home, others to /dashboard
          { index: true, element: <RootRedirect /> },

          // Dashboard
          {
            path: "dashboard",
            element: <DashboardPage />,
            handle: { crumb: "Dashboard" },
          },

          // ── Profile & auth self-service ──────────────────────────────
          {
            path: "profile",
            element: <Lazy><ProfilePage /></Lazy>,
            handle: { crumb: "Profile" },
          },
          {
            path: "settings",
            handle: { crumb: "Settings" },
            children: [
              {
                path: "change-password",
                element: <Lazy><ChangePasswordPage /></Lazy>,
                handle: { crumb: "Change Password" },
              },
              {
                path: "pricing",
                element: <Lazy><PricingPage /></Lazy>,
                handle: { crumb: "Plans & Pricing" },
              },
              {
                path: "backup",
                element: <Lazy><BackupPage /></Lazy>,
                handle: { crumb: "Backup & Restore" },
              },
            ],
          },

          // ── Admin routes (gym_owner, branch_manager, staff, super_admin) ──
          {
            element: <ProtectedRoute allowedRoles={["gym_owner", "branch_manager", "staff", "super_admin"]} />,
            children: [

          // ── Members ──────────────────────────────────────────────────
          {
            path: "members",
            handle: { crumb: "Members" },
            children: [
              { index: true, element: <Lazy><MembersPage /></Lazy> },
              {
                path: ":memberId",
                element: <Lazy><MemberDetailPage /></Lazy>,
                handle: { crumb: "Member Detail" },
              },
            ],
          },

          // ── Membership Plans ─────────────────────────────────────────
          {
            path: "membership-plans",
            element: <Lazy><MembershipPlansPage /></Lazy>,
            handle: { crumb: "Membership Plans" },
          },

          // ── Billing ───────────────────────────────────────────────────
          {
            path: "billing",
            handle: { crumb: "Billing" },
            children: [
              { index: true, element: <Navigate to="/billing/dashboard" replace /> }, // ← Redirect to dashboard
              {
                path: "dashboard",
                element: <FeatureRoute feature="billing" featureName="Billing"><Lazy><BillingDashboard /></Lazy></FeatureRoute>,
                handle: { crumb: "Dashboard" },
              },
              {
                path: "invoices",
                element: <FeatureRoute feature="billing" featureName="Billing"><Lazy><InvoicesPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Invoices" },
              },
              {
                path: "invoices/:invoiceId",
                element: <FeatureRoute feature="billing" featureName="Billing"><Lazy><InvoiceDetailPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Invoice" },
              },
              {
                path: "discounts",
                element: <FeatureRoute feature="discounts" featureName="Discounts"><Lazy><DiscountsPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Discounts" },
              },
            ],
          },

          // ── Expenses ─────────────────────────────────────────────────
          {
            path: "expenses",
            element: <FeatureRoute feature="expenses" featureName="Expenses"><Lazy><ExpensesPage /></Lazy></FeatureRoute>,
            handle: { crumb: "Expenses" },
          },
          {
            path: "expense-analytics",
            element: <FeatureRoute feature="expenses" featureName="Expenses"><Lazy><ExpenseAnalyticsPage /></Lazy></FeatureRoute>,
            handle: { crumb: "Expense Analytics" },
          },

          // ── Refunds ──────────────────────────────────────────────────
          {
            path: "refunds",
            element: <FeatureRoute feature="billing" featureName="Billing"><Lazy><RefundsPage /></Lazy></FeatureRoute>,
            handle: { crumb: "Refunds" },
          },

          // ── Walk-in Leads ────────────────────────────────────────────
          {
            path: "walk-in-leads",
            element: <FeatureRoute feature="walkInLeads" featureName="Walk-in Leads"><Lazy><WalkInLeadsPage /></Lazy></FeatureRoute>,
            handle: { crumb: "Walk-in Leads" },
          },

          // ── Staff ────────────────────────────────────────────────────
          {
            path: "staff",
            handle: { crumb: "Staff" },
            children: [
              { index: true, element: <Lazy><StaffPage /></Lazy> },
              {
                path: ":staffId",
                element: <Lazy><StaffDetailPage /></Lazy>,
                handle: { crumb: "Staff Detail" },
              },
            ],
          },

          // ── Trainers ─────────────────────────────────────────────────
          {
            path: "trainers",
            handle: { crumb: "Trainers" },
            children: [
              { index: true, element: <Lazy><TrainersPage /></Lazy> },
              {
                path: ":trainerId",
                element: <Lazy><TrainerDetailPage /></Lazy>,
                handle: { crumb: "Trainer Detail" },
              },
            ],
          },

          // ── Equipment ────────────────────────────────────────────────
          {
            path: "equipment",
            handle: { crumb: "Equipment" },
            children: [
              { index: true, element: <FeatureRoute feature="equipment" featureName="Equipment"><Lazy><EquipmentPage /></Lazy></FeatureRoute> },
              {
                path: ":equipmentId",
                element: <FeatureRoute feature="equipment" featureName="Equipment"><Lazy><EquipmentDetailPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Equipment Detail" },
              },
            ],
          },

          // ── Work Orders ───────────────────────────────────────────────
          // {
          //   path: "work-orders",
          //   element: <Lazy><WorkOrdersPage /></Lazy>,
          //   handle: { crumb: "Work Orders" },
          // },

          // ── Reports ───────────────────────────────────────────────────
          {
            path: "reports",
            element: <FeatureRoute feature="reports" featureName="Reports"><Lazy><ReportsPage /></Lazy></FeatureRoute>,
            handle: { crumb: "Reports" },
          },

          // ── Notifications ─────────────────────────────────────────────
          {
            path: "notifications",
            element: <Lazy><NotificationsPage /></Lazy>,
            handle: { crumb: "Notifications" },
          },

          // ── Branches ─────────────────────────────────────────────────
          {
            path: "branches",
            handle: { crumb: "Branches" },
            children: [
              { index: true, element: <FeatureRoute feature="branches" featureName="Multi-Branch"><Lazy><BranchesPage /></Lazy></FeatureRoute> },
              {
                path: ":branchId",
                element: <FeatureRoute feature="branches" featureName="Multi-Branch"><Lazy><BranchDetailPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Branch Detail" },
              },
            ],
          },

            ]},  // end admin ProtectedRoute

          // ── Member portal (members only) ─────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={["member"]} />,
            children: [{
            path: "member",
            children: [
              { index: true, element: <Navigate to="/member/home" replace /> },
              {
                path: "home",
                element: <FeatureRoute feature="memberPortal" featureName="Member Portal"><Lazy><MemberHomePage /></Lazy></FeatureRoute>,
                handle: { crumb: "Home" },
              },
              {
                path: "plan",
                element: <FeatureRoute feature="memberPortal" featureName="Member Portal"><Lazy><MemberPlanPage /></Lazy></FeatureRoute>,
                handle: { crumb: "My Plan" },
              },
              {
                path: "invoices",
                element: <FeatureRoute feature="memberPortal" featureName="Member Portal"><Lazy><MemberInvoicesPage /></Lazy></FeatureRoute>,
                handle: { crumb: "My Invoices" },
              },
              {
                path: "trainer",
                element: <FeatureRoute feature="memberPortal" featureName="Member Portal"><Lazy><MemberTrainerPage /></Lazy></FeatureRoute>,
                handle: { crumb: "My Trainer" },
              },
              {
                path: "fit-plan",
                handle: { crumb: "FitPlan" },
                children: [
                  { index: true, element: <FeatureRoute feature="fitPlan" featureName="FitPlan"><Lazy><FitPlanPage /></Lazy></FeatureRoute> },
                  {
                    path: "progress",
                    element: <FeatureRoute feature="fitPlan" featureName="FitPlan"><Lazy><FitPlanProgressPage /></Lazy></FeatureRoute>,
                    handle: { crumb: "Progress" },
                  },
                  {
                    path: "history",
                    element: <FeatureRoute feature="fitPlan" featureName="FitPlan"><Lazy><FitPlanHistoryPage /></Lazy></FeatureRoute>,
                    handle: { crumb: "Plan History" },
                  },
                ],
              },
            ],
          },
          ]},  // end member ProtectedRoute

          // ── Trainer portal (trainers only) ───────────────────────────
          {
            element: <ProtectedRoute allowedRoles={["trainer"]} />,
            children: [{
            path: "trainer",
            children: [
              { index: true, element: <Navigate to="/trainer/dashboard" replace /> },
              {
                path: "dashboard",
                element: <FeatureRoute feature="trainerPortal" featureName="Trainer Portal"><Lazy><TrainerDashboardPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Dashboard" },
              },
              {
                path: "clients",
                element: <FeatureRoute feature="trainerPortal" featureName="Trainer Portal"><Lazy><TrainerClientsPage /></Lazy></FeatureRoute>,
                handle: { crumb: "My Clients" },
              },
              {
                path: "notes",
                element: <FeatureRoute feature="trainerPortal" featureName="Trainer Portal"><Lazy><TrainerNotesPage /></Lazy></FeatureRoute>,
                handle: { crumb: "Training Notes" },
              },
            ],
          },
          ]},  // end trainer ProtectedRoute

          // ── Roles ─────────────────────────────────────────────────────
          // {
          //   path: "roles",
          //   element: <Lazy><RolesPage /></Lazy>,
          //   handle: { crumb: "Roles & Permissions" },
          // },

        ],
      },
    ],
  },

  // ── Super Admin (role-gated, shares AppShell) ─────────────────────────────
  {
    path: "/super-admin",
    element: <ProtectedRoute allowedRoles={["super_admin"]} />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Lazy><SuperAdminPage /></Lazy>,
            handle: { crumb: "Super Admin" },
          },
          {
            path: "tenants/:tenantId",
            element: <Lazy><TenantDetailPage /></Lazy>,
            handle: { crumb: "Tenant Detail" },
          },
          {
            path: "plans",
            element: <Lazy><PlansPage /></Lazy>,
            handle: { crumb: "Plans" },
          },
          {
            path: "leads",
            element: <Lazy><LeadsPage /></Lazy>,
            handle: { crumb: "Leads" },
          },
          {
            path: "leads/:leadId",
            element: <Lazy><LeadsPage /></Lazy>,
            handle: { crumb: "Lead Detail" },
          },
        ],
      },
    ],
  },

  // ── Error pages ───────────────────────────────────────────────────────────
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  { path: "*",             element: <NotFoundPage /> },
]);

export default router;