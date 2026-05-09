import { Users, CreditCard, Dumbbell, TrendingUp, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/layout/PageHeader';
import PageShell from '@/components/layout/PageShell';
import StatCard from '@/components/shared/StatCard';
import { useAuthStore } from '@/stores/auth.store';

// ─── Quick-action links ───────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: 'View Members',   href: '/members',    icon: Users },
  { label: 'View Trainers',  href: '/trainers',   icon: Dumbbell },
  { label: 'View Billing',   href: '/billing',    icon: CreditCard },
  { label: 'View Reports',   href: '/reports',    icon: TrendingUp },
];

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <PageShell>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={today}
      />

      {/* KPI strip — values will populate once dashboard API is wired */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value="—"
          icon={Users}
          iconClassName="bg-primary/10 text-primary"
          subtitle="Across all branches"
        />
        <StatCard
          title="Revenue This Month"
          value="—"
          icon={CreditCard}
          iconClassName="bg-emerald-500/10 text-emerald-600"
          subtitle="Invoices paid"
        />
        <StatCard
          title="Active Trainers"
          value="—"
          icon={Dumbbell}
          iconClassName="bg-purple-500/10 text-purple-600"
          subtitle="Currently assigned"
        />
        <StatCard
          title="Growth"
          value="—"
          icon={TrendingUp}
          iconClassName="bg-amber-500/10 text-amber-600"
          subtitle="New members this month"
        />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[18rem]">
                Activity feed will appear here once the dashboard API is connected.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick navigation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Access</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-1.5">
            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
              <a key={href} href={href}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Role / plan info strip */}
      {user && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Logged in as</span>
              <Badge variant="secondary" className="capitalize font-medium">
                {user.role?.replace(/_/g, ' ')}
              </Badge>
              {user.tenantId && (
                <>
                  <span className="opacity-40">·</span>
                  <span>Tenant ID: <code className="text-xs bg-muted rounded px-1 py-0.5">{user.tenantId}</code></span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
