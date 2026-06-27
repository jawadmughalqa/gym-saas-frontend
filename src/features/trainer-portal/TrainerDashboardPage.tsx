import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/format';
import {
  useMyTrainerProfile,
  useMyAssignments,
  type TrainerAssignmentItem,
  type AssignedMember,
} from './hooks/use-trainer-portal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberName(memberId: AssignedMember | string | undefined): string {
  if (!memberId) return 'Unknown';
  if (typeof memberId === 'string') return 'Member';
  return `${memberId.firstName ?? ''} ${memberId.lastName ?? ''}`.trim() || 'Unknown';
}

function memberObj(memberId: AssignedMember | string | undefined): AssignedMember | null {
  if (!memberId || typeof memberId === 'string') return null;
  return memberId;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ assignment }: { assignment: TrainerAssignmentItem }) {
  const member = memberObj(assignment.memberId);
  const name   = memberName(assignment.memberId);

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">
            {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {assignment.goal
              ? assignment.goal
              : `Since ${formatDate(assignment.startDate)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {assignment.sessionFrequencyPerWeek && (
          <Badge variant="outline" className="text-xs hidden sm:flex">
            {assignment.sessionFrequencyPerWeek}x / week
          </Badge>
        )}
        <Badge className="bg-green-500/15 text-green-500 border-green-500/25 hover:bg-green-500/15 text-xs">
          Active
        </Badge>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainerDashboardPage() {
  const { data: profile, isLoading: loadingProfile } = useMyTrainerProfile();
  const { data: assignments = [], isLoading: loadingAssignments } = useMyAssignments(profile?._id);

  const isLoading = loadingProfile || loadingAssignments;

  const activeClients  = assignments.filter((a) => a.status === 'active');
  const endedClients   = assignments.filter((a) => a.status === 'ended');
  const totalRevenue   = activeClients.reduce((sum, a) => sum + (a.monthlyCharge ?? 0), 0);
  const currency       = activeClients[0]?.currency ?? profile?.currency ?? 'PKR';

  // Show max 5 active clients on dashboard
  const recentClients = activeClients.slice(0, 5);

  const trainerName = profile?.userId
    ? `${profile.userId.firstName} ${profile.userId.lastName}`.trim()
    : 'Trainer';

  return (
    <PageShell>
      <PageHeader
        title={`Welcome, ${trainerName}`}
        subtitle="Here's an overview of your clients and sessions."
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* ── Stats ─────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Active Clients"
              value={activeClients.length}
              icon={Users}
              description={`${endedClients.length} past client${endedClients.length !== 1 ? 's' : ''}`}
            />
            <StatCard
              title="Monthly Revenue"
              value={`${currency} ${totalRevenue.toLocaleString()}`}
              icon={TrendingUp}
              description="From active PT charges"
            />
            <StatCard
              title="Specializations"
              value={profile?.specializations?.length ?? 0}
              icon={ClipboardCheck}
              description={profile?.specializations?.slice(0, 2).join(', ') || 'None listed'}
            />
          </div>

          {/* ── Active clients list ─────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Active Clients</CardTitle>
              {activeClients.length > 5 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/trainer/clients">
                    View all
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No active clients</p>
                  <p className="text-xs mt-1">
                    Clients assigned to you will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {recentClients.map((a) => (
                    <ClientRow key={a._id} assignment={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Quick links ─────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-auto py-4 flex-col gap-1" asChild>
              <Link to="/trainer/clients">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">View All Clients</span>
                <span className="text-xs text-muted-foreground">
                  {activeClients.length} active · {endedClients.length} past
                </span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-1" asChild>
              <Link to="/trainer/notes">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-sm font-medium">Training Notes</span>
                <span className="text-xs text-muted-foreground">
                  Add notes for your clients
                </span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
