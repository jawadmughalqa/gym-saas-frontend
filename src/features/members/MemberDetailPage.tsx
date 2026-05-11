import { useState }       from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, CreditCard,
  Clock, Activity, Edit, AlertCircle,
} from 'lucide-react';
import { Button }    from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton }  from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageShell from '@/components/layout/PageShell';
import { MembershipStatusBadge } from '@/components/shared/StatusBadge';
import { usePermission } from '@/hooks/use-permission';
import { formatDate }    from '@/utils/format';
import { useGetMembersMemberId } from '@/api/generated/members/members';

// ─── Tab components ───────────────────────────────────────────────────────────
import { ProfileTab }       from './components/MemberDetail/ProfileTab';
import { SubscriptionsTab } from './components/MemberDetail/SubscriptionsTab';
import { CheckInsTab }      from './components/MemberDetail/CheckInsTab';
import { MeasurementsTab }  from './components/MemberDetail/MeasurementsTab';
import MemberForm           from './components/MemberForm';

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate     = useNavigate();
  const { can }      = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const { data: response, isLoading } = useGetMembersMemberId(memberId ?? '');
  const member           = response?.data;
  const activeSubscription =
    (member as { activeSubscription?: unknown } | undefined)?.activeSubscription ?? null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!member) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Member not found</h2>
          <Button variant="outline" onClick={() => navigate('/members')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Members
          </Button>
        </div>
      </PageShell>
    );
  }

  const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();

  return (
    <PageShell>
      {/* ── Back + header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 mt-0.5"
          onClick={() => navigate('/members')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold truncate">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <MembershipStatusBadge status={member.status ?? 'active'} />
                {activeSubscription && (
                  <span className="text-xs text-muted-foreground">
                    {(activeSubscription as { planSnapshot?: { name?: string } })
                      .planSnapshot?.name ??
                      (activeSubscription as { customLabel?: string }).customLabel ??
                      'Active Plan'}
                    {' · expires '}
                    {(activeSubscription as { endDate?: string }).endDate
                      ? formatDate((activeSubscription as { endDate: string }).endDate)
                      : 'ongoing'}
                  </span>
                )}
              </div>
            </div>

            {can('member.update') && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Check-ins</span>
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Measurements</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab memberId={member._id ?? ''} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab
            memberId={member._id ?? ''}
            branchId={member.branchId ?? ''}
          />
        </TabsContent>

        <TabsContent value="checkins" className="mt-4">
          <CheckInsTab memberId={member._id ?? ''} />
        </TabsContent>

        <TabsContent value="measurements" className="mt-4">
          <MeasurementsTab memberId={member._id ?? ''} />
        </TabsContent>
      </Tabs>

      {/* ── Edit profile sheet ─────────────────────────────────────────────── */}
      <MemberForm
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member as Parameters<typeof MemberForm>[0]['member']}
      />
    </PageShell>
  );
}