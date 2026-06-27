import { useNavigate } from 'react-router-dom';
import {
  Check, X, ArrowLeft, Sparkles, Mail, MessageCircle,
  Users, UserCheck, CreditCard, ScanLine, BarChart3,
  Receipt, GitBranch, Wrench, Bell, Tag, Dumbbell, Smartphone,
  UserPlus, ShoppingCart, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useGetMyTenant, useGetTenantPlans } from '@/api/generated/tenants/tenants';
import type { Plan } from '@/api/generated/schemas/plan';

// ─── Feature Flag definitions (same as PlansPage) ────────────────────────────

interface FeatureDef {
  key:         string;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
}

const FEATURES: FeatureDef[] = [
  { key: 'members',       label: 'Members',          description: 'Member registration & management',      icon: Users,       color: 'text-blue-500'   },
  { key: 'trainers',      label: 'Trainers',          description: 'Trainer management & assignments',      icon: UserCheck,   color: 'text-violet-500' },
  { key: 'billing',       label: 'Billing',           description: 'Invoices, payments & subscriptions',   icon: CreditCard,  color: 'text-green-500'  },
  { key: 'attendance',    label: 'Attendance',        description: 'Check-in & attendance tracking',       icon: ScanLine,    color: 'text-cyan-500'   },
  { key: 'notifications', label: 'Notifications',     description: 'In-app & push notifications',          icon: Bell,        color: 'text-amber-500'  },
  { key: 'memberPortal',  label: 'Member Portal',     description: 'Member self-service portal',           icon: Smartphone,  color: 'text-indigo-500' },
  { key: 'reports',       label: 'Advanced Reports',  description: 'Analytics, revenue & growth reports',  icon: BarChart3,   color: 'text-rose-500'   },
  { key: 'expenses',      label: 'Expenses',          description: 'Expense tracking & analytics',         icon: Receipt,     color: 'text-orange-500' },
  { key: 'branches',      label: 'Multi-Branch',      description: 'Multiple gym locations',               icon: GitBranch,   color: 'text-teal-500'   },
  { key: 'equipment',     label: 'Equipment',         description: 'Equipment & maintenance management',   icon: Wrench,      color: 'text-muted-foreground'  },
  { key: 'discounts',     label: 'Discounts',         description: 'Discount codes & promotions',          icon: Tag,         color: 'text-pink-500'   },
  { key: 'fitPlan',             label: 'FitPlan',                description: 'AI-powered personalised fitness plans',         icon: Dumbbell,      color: 'text-emerald-500'  },
  { key: 'walkInLeads',         label: 'Walk-in Leads',          description: 'Track walk-in visitors & prospect CRM',         icon: UserPlus,      color: 'text-fuchsia-500'  },
  { key: 'trainerPortal',       label: 'Trainer Portal',         description: 'Trainer self-service login portal',             icon: UserCheck,     color: 'text-teal-500'     },
  { key: 'branchManagerPortal', label: 'Branch Manager Portal',  description: 'Branch manager dedicated portal',               icon: GitBranch,     color: 'text-violet-500'   },
  { key: 'pos',                 label: 'Point of Sale',          description: 'Product catalog, orders & receipts',            icon: ShoppingCart,  color: 'text-lime-500'     },
  { key: 'notificationChannels', label: 'Notification Channels', description: 'SMTP, WhatsApp channels & broadcast messaging', icon: MessageSquare, color: 'text-sky-500'      },
];

// ─── Plan tier styles ─────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, {
  border: string; activeBorder: string; badge: string; accent: string; cardBg: string;
}> = {
  starter:    { border: 'border-border',  activeBorder: 'border-slate-500',   badge: 'bg-muted text-muted-foreground',   accent: 'text-muted-foreground',   cardBg: '' },
  pro:        { border: 'border-purple-500/25', activeBorder: 'border-purple-500',  badge: 'bg-purple-500/15 text-purple-500', accent: 'text-purple-500',  cardBg: 'bg-purple-500/10 dark:bg-purple-950/20' },
  enterprise: { border: 'border-amber-500/25',  activeBorder: 'border-amber-500',   badge: 'bg-amber-500/15 text-amber-500',   accent: 'text-amber-500',   cardBg: 'bg-amber-500/10 dark:bg-amber-950/20' },
};

// ─── Quota display ────────────────────────────────────────────────────────────

function quotaLabel(val: number | undefined, unit?: string): string {
  if (val === -1 || val === undefined) return '∞';
  return unit ? `${val} ${unit}` : String(val);
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  featureFlags,
}: {
  plan: Plan;
  isCurrent: boolean;
  featureFlags: Record<string, boolean>;
}) {
  const planName   = plan.name ?? 'starter';
  const styles     = TIER_STYLES[planName] ?? TIER_STYLES['starter'];
  const currency   = plan.currency ?? 'PKR';
  const planAny    = plan as Plan & { billingCycle?: string; trialDays?: number };
  const billing    = planAny.billingCycle ?? 'monthly';
  const trialDays  = planAny.trialDays ?? 0;

  return (
    <Card
      className={cn(
        'relative flex flex-col border-2 transition-all',
        isCurrent ? styles.activeBorder : styles.border,
        styles.cardBg,
      )}
    >
      {/* Current plan ribbon */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            <Sparkles className="h-3 w-3" />
            Current Plan
          </span>
        </div>
      )}

      <CardHeader className={cn('pb-4', isCurrent && 'pt-7')}>
        {/* Plan name + tier badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className={cn('text-xl font-bold capitalize', styles.accent)}>
            {plan.displayName ?? planName}
          </h3>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', styles.badge)}>
            {planName}
          </span>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        {/* Price */}
        <div className="mt-3">
          <span className={cn('text-3xl font-bold', styles.accent)}>
            {formatCurrency(plan.price ?? 0, currency)}
          </span>
          <span className="text-muted-foreground text-sm">/{billing}</span>
        </div>

        {trialDays > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{trialDays}-day free trial</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Quotas */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limits</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { label: 'Members',        val: plan.quotas?.maxMembers },
              { label: 'Trainers',       val: plan.quotas?.maxTrainers },
              { label: 'Branches',       val: plan.quotas?.maxBranches },
              { label: 'Storage',        val: plan.quotas?.maxStorageMb, unit: 'MB' },
              { label: 'Emails/month',   val: plan.quotas?.maxEmailSendsPerMonth },
            ].map(({ label, val, unit }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{quotaLabel(val, unit)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Features */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</p>
          <div className="space-y-1.5">
            {FEATURES.map(({ key, label, icon: Icon, color }) => {
              const enabled = featureFlags[key] ?? false;
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    !enabled && 'opacity-40',
                  )}
                >
                  {enabled
                    ? <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    : <X     className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  }
                  <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', enabled ? color : 'text-muted-foreground')} />
                  <span className={enabled ? 'font-medium' : ''}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PricingPage ──────────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate();

  const { data: tenantRes, isLoading: tenantLoading } = useGetMyTenant();
  const { data: plansRes,  isLoading: plansLoading  } = useGetTenantPlans({
    query: { staleTime: 1000 * 60 * 10 },
  });

  const currentPlanName = tenantRes?.data?.plan ?? '';
  const plans: Plan[]   = plansRes?.data ?? [];
  const isLoading       = tenantLoading || plansLoading;

  // Contact Us
  const CONTACT_EMAIL    = 'mughaljawaddev@gmail.com';
  const WHATSAPP_NUMBER  = '923343709700';
  const contactSubject   = encodeURIComponent('Custom Plan Enquiry — Gym Management');
  const contactBody      = encodeURIComponent(
    `Hi,\n\nI'm interested in a custom plan for my gym.\n\nBusiness: ${tenantRes?.data?.businessName ?? ''}\nCurrent Plan: ${currentPlanName}\n\nPlease share more details.`,
  );
  const gmailUrl         = `https://mail.google.com/mail/?view=cm&to=${CONTACT_EMAIL}&su=${contactSubject}&body=${contactBody}`;
  const whatsappMessage  = encodeURIComponent(`Hi, I'm interested in a custom plan for my gym (${tenantRes?.data?.businessName ?? ''}). Can you help me?`);
  const whatsappUrl      = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Plans & Pricing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare plans and see what features are included in each tier.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-green-600 border-green-500/25 hover:bg-green-500/10 hover:text-green-500">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
          <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Mail className="h-4 w-4" />
              Contact Us
            </Button>
          </a>
        </div>
      </div>

      {/* Current plan callout */}
      {!tenantLoading && currentPlanName && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm">
            You are currently on the{' '}
            <span className="font-semibold capitalize">{currentPlanName}</span> plan.
            {' '}To upgrade or make changes, contact us using the button above.
          </p>
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[620px] rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <p className="text-muted-foreground text-sm">No plans configured yet. Contact us for details.</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2 text-green-600 border-green-500/25 hover:bg-green-500/10 hover:text-green-500">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Mail className="h-4 w-4" />
                Get in Touch
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {plans
            .slice()
            .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
            .map((plan) => {
              const flags = (plan.featureFlags ?? {}) as Record<string, boolean>;
              return (
                <PlanCard
                  key={plan._id ?? plan.name}
                  plan={plan}
                  isCurrent={plan.name === currentPlanName}
                  featureFlags={flags}
                />
              );
            })}
        </div>
      )}

      {/* Custom plan CTA */}
      <div className="rounded-xl border-2 border-dashed p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="font-semibold text-base">Need a Custom Plan?</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Have specific requirements — more branches, higher member limits, or custom integrations?
          We can build a plan tailored to your business.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-1">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 text-green-600 border-green-500/25 hover:bg-green-500/10 hover:text-green-500">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
          <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2">
              <Mail className="h-4 w-4" />
              Request a Custom Plan
            </Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">{CONTACT_EMAIL}</p>
      </div>
    </div>
  );
}
