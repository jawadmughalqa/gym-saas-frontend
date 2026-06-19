import { useNavigate } from 'react-router-dom';
import {
  KeyRound, Mail, Shield, User, Building2,
  CreditCard, Sparkles, ArrowRight, Check,
  Users, UserCheck, CreditCard as CreditCardIcon, ScanLine, BarChart3,
  Receipt, GitBranch, Wrench, Bell, Tag, Dumbbell, Smartphone, UserPlus,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'default';
  if (role === 'admin' || role === 'owner') return 'secondary';
  return 'outline';
}

const PLAN_TIER_STYLES: Record<string, { badge: string; accent: string; border: string }> = {
  starter:    { badge: 'bg-slate-100 text-slate-700',   accent: 'text-slate-700',  border: 'border-slate-200'  },
  pro:        { badge: 'bg-purple-100 text-purple-700', accent: 'text-purple-700', border: 'border-purple-200' },
  enterprise: { badge: 'bg-amber-100 text-amber-700',   accent: 'text-amber-700',  border: 'border-amber-200'  },
};

// Maps featureFlag keys to icons & labels for display
const FLAG_DISPLAY: Record<string, { label: string; icon: React.ElementType }> = {
  members:       { label: 'Members',          icon: Users           },
  trainers:      { label: 'Trainers',          icon: UserCheck       },
  billing:       { label: 'Billing',           icon: CreditCardIcon  },
  attendance:    { label: 'Attendance',        icon: ScanLine        },
  notifications: { label: 'Notifications',     icon: Bell            },
  memberPortal:  { label: 'Member Portal',     icon: Smartphone      },
  reports:       { label: 'Reports',           icon: BarChart3       },
  expenses:      { label: 'Expenses',          icon: Receipt         },
  branches:      { label: 'Multi-Branch',      icon: GitBranch       },
  equipment:     { label: 'Equipment',         icon: Wrench          },
  discounts:     { label: 'Discounts',         icon: Tag             },
  fitPlan:       { label: 'FitPlan',           icon: Dumbbell        },
  walkInLeads:   { label: 'Walk-in Leads',     icon: UserPlus        },
};

// ─── Subscription Plan Card (gym_owner only) ──────────────────────────────────

function SubscriptionCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetMyTenant({ query: { staleTime: 1000 * 60 * 5 } });

  const tenant     = data?.data;
  const planName   = tenant?.plan ?? '';
  const styles     = PLAN_TIER_STYLES[planName] ?? PLAN_TIER_STYLES['starter'];
  const tenantAny  = tenant as (typeof tenant) & { billingCycle?: string; billingCycleDay?: number };
  const billing    = tenantAny?.billingCycle ?? 'monthly';
  const flags      = (tenant?.featureFlags ?? {}) as Record<string, boolean>;
  const currency   = tenant?.settings?.currency ?? 'PKR';
  // We don't have price here (it's on the Plan doc), so just show plan name + features

  const enabledFeatures = Object.entries(FLAG_DISPLAY).filter(([key]) => flags[key]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!tenant) return null;

  return (
    <Card className={cn('border-2', styles.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Subscription</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => navigate('/settings/pricing')}
          >
            View Plans
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plan name + billing cycle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', styles.badge)}>
              {planName}
            </span>
            <span className="text-sm text-muted-foreground capitalize">{billing}</span>
          </div>
          {tenant.status && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs capitalize',
                tenant.status === 'active' && 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400',
                tenant.status === 'trial'  && 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400',
                tenant.status === 'suspended' && 'border-red-200 text-red-700',
              )}
            >
              {tenant.status}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Enabled features */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Active Features
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5">
            {enabledFeatures.map(([key, { label, icon: Icon }]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs min-w-0">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quotas row */}
        {tenant.quotas && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Limits
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  { label: 'Members',   val: tenant.quotas.maxMembers  },
                  { label: 'Trainers',  val: tenant.quotas.maxTrainers  },
                  { label: 'Branches',  val: tenant.quotas.maxBranches  },
                  { label: 'Emails/mo', val: tenant.quotas.maxEmailSendsPerMonth },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{val === -1 ? '∞' : (val ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Upgrade CTA — not on enterprise */}
        {planName !== 'enterprise' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={() => navigate('/settings/pricing')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            See All Plans & Upgrade
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const isGymOwner = user.role === 'gym_owner';

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          View your account details and manage settings.
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
              <AvatarFallback className="text-lg sm:text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">{user.name}</CardTitle>
              <Badge variant={roleBadgeVariant(user.role)} className="capitalize">
                {roleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5 space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email address</p>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{roleLabel(user.role)}</p>
            </div>
          </div>

          {/* Tenant (if not super admin) */}
          {user.tenantId && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-sm font-medium font-mono truncate">{user.tenantId}</p>
              </div>
            </div>
          )}

          {/* Permissions count */}
          {(user.permissions?.length ?? 0) > 0 && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Permissions</p>
                <p className="text-sm font-medium">{user.permissions?.length ?? 0} granted</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription — gym owner only */}
      {isGymOwner && <SubscriptionCard />}

      {/* Account actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/settings/change-password')}
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </Button>
          {isGymOwner && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/settings/pricing')}
            >
              <Sparkles className="h-4 w-4" />
              View plans
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
