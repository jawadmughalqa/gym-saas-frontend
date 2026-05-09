import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, CreditCard, Clock, Activity,
  Phone, Mail, Calendar, MapPin, AlertCircle, Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import { MembershipStatusBadge, SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatDateTime, formatCurrency, formatRelative } from '@/utils/format';
import {
  useMember,
  useMemberSubscriptions,
  useMemberCheckIns,
  useMemberMeasurements,
  useCancelSubscription,
  useFreezeSubscription,
  useLogMeasurement,
} from './hooks/use-members';
import MemberForm from './components/MemberForm';
import SubscriptionForm from './components/SubscriptionForm';
import MeasurementForm from './components/MeasurementForm';
import type { Subscription, CheckIn, Measurement } from '@/types/member.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ memberId }: { memberId: string }) {
  const { data, isLoading } = useMember(memberId);
  const member = data?.member;

  if (isLoading) return <CardSkeleton />;
  if (!member) return null;

  const genderLabel: Record<string, string> = {
    male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <InfoRow label="Full Name" value={member.fullName} />
          <InfoRow label="Email" value={<span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{member.email}</span>} />
          <InfoRow label="Phone" value={<span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{member.phone}</span>} />
          <InfoRow label="Date of Birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : undefined} />
          <InfoRow label="Gender" value={member.gender ? genderLabel[member.gender] : undefined} />
          <InfoRow label="Joined" value={<span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{formatDate(member.joinedAt)}</span>} />
          <InfoRow label="Branch" value={<span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{member.branchId}</span>} />
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {member.emergencyContact ? (
            <>
              <InfoRow label="Name" value={member.emergencyContact.name} />
              <InfoRow label="Relationship" value={member.emergencyContact.relationship} />
              <InfoRow label="Phone" value={<span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{member.emergencyContact.phone}</span>} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No emergency contact on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Health & Consents */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Consent & Health
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={member.consentMarketing ? 'default' : 'secondary'}>
            Marketing: {member.consentMarketing ? 'Yes' : 'No'}
          </Badge>
          <Badge variant={member.consentDataProcessing ? 'default' : 'secondary'}>
            Data Processing: {member.consentDataProcessing ? 'Yes' : 'No'}
          </Badge>
          {member.waiver && (
            <Badge variant="outline">Waiver signed {formatDate(member.waiver.signedAt)}</Badge>
          )}
          {member.healthQuestionnaire?.completedAt && (
            <Badge variant="outline">Health form completed {formatDate(member.healthQuestionnaire.completedAt)}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {member.notes && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Staff Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

function SubscriptionsTab({ memberId }: { memberId: string }) {
  const { can } = usePermission();
  const { data: subscriptions, isLoading } = useMemberSubscriptions(memberId);
  const { confirm, confirmProps } = useConfirm();
  const cancel = useCancelSubscription(memberId);
  const freeze = useFreezeSubscription(memberId);

  const [subFormOpen, setSubFormOpen] = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  function handleFreeze(sub: Subscription) {
    setSelectedSubId(sub._id);
    setFreezeDialogOpen(true);
  }

  const columns: ColumnDef<Subscription>[] = [
    {
      key: 'plan',
      header: 'Plan',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.plan?.name ?? row.planId}</p>
          <p className="text-xs text-muted-foreground">{row.plan?.billingFrequency}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <SubscriptionStatusBadge status={row.status} />,
    },
    {
      key: 'startDate',
      header: 'Start',
      hideOnMobile: true,
      cell: (row) => formatDate(row.startDate),
    },
    {
      key: 'endDate',
      header: 'End',
      hideOnMobile: true,
      cell: (row) => row.endDate ? formatDate(row.endDate) : '—',
    },
    {
      key: 'actions',
      header: '',
      width: 'w-32',
      cell: (row) => row.status === 'active' ? (
        <div className="flex items-center gap-1 justify-end">
          {can('member.update') && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleFreeze(row); }}>
              Freeze
            </Button>
          )}
          {can('member.update') && (
            <Button
              variant="ghost" size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                confirm(
                  { title: 'Cancel subscription?', description: 'This will cancel the subscription immediately. This action cannot be undone.', variant: 'destructive', confirmLabel: 'Cancel Subscription' },
                  () => cancel.mutate({ subscriptionId: row._id, body: { reason: 'Cancelled by staff' } }),
                );
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subscriptions?.length ?? 0} subscription{subscriptions?.length !== 1 ? 's' : ''} total
        </p>
        {can('member.create') && (
          <Button size="sm" onClick={() => setSubFormOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Assign Plan
          </Button>
        )}
      </div>

      {!isLoading && (!subscriptions || subscriptions.length === 0) ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="No subscriptions"
          description="Assign a membership plan to get started."
          action={can('member.create') ? { label: 'Assign Plan', onClick: () => setSubFormOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={subscriptions ?? []}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={3}
        />
      )}

      <SubscriptionForm
        open={subFormOpen}
        onOpenChange={setSubFormOpen}
        memberId={memberId}
      />

      {/* Freeze dialog — inline simple version */}
      {freezeDialogOpen && selectedSubId && (
        <FreezeDialog
          subscriptionId={selectedSubId}
          memberId={memberId}
          open={freezeDialogOpen}
          onOpenChange={(o) => { setFreezeDialogOpen(o); if (!o) setSelectedSubId(null); }}
        />
      )}

      <ConfirmDialog {...confirmProps} loading={cancel.isPending} />
    </div>
  );
}

// ─── FreezeDialog (inline) ────────────────────────────────────────────────────

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const freezeSchema = z.object({
  resumeAt: z.string().min(1, 'Resume date is required'),
  reason: z.string().optional(),
});
type FreezeForm = z.infer<typeof freezeSchema>;

function FreezeDialog({
  subscriptionId, memberId, open, onOpenChange,
}: { subscriptionId: string; memberId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const freeze = useFreezeSubscription(memberId, { onSuccess: () => onOpenChange(false) });

  const { register, handleSubmit, formState: { errors } } = useForm<FreezeForm>({
    resolver: zodResolver(freezeSchema),
  });

  function onSubmit(values: FreezeForm) {
    freeze.mutate({ subscriptionId, body: { resumeAt: values.resumeAt, reason: values.reason } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Freeze Subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resumeAt">Resume Date *</Label>
            <Input id="resumeAt" type="date" disabled={freeze.isPending} {...register('resumeAt')} />
            {errors.resumeAt && <p className="text-xs text-destructive">{errors.resumeAt.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freezeReason">Reason (optional)</Label>
            <Input id="freezeReason" placeholder="e.g. Travelling" disabled={freeze.isPending} {...register('reason')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={freeze.isPending}>Cancel</Button>
            <Button type="submit" disabled={freeze.isPending}>
              {freeze.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Freeze
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Check-ins Tab ────────────────────────────────────────────────────────────

function CheckInsTab({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMemberCheckIns(memberId, { page, limit: 20 });

  const methodLabel: Record<string, string> = {
    qr: 'QR Code', rfid: 'RFID', manual: 'Manual', app: 'App',
  };

  const columns: ColumnDef<CheckIn>[] = [
    {
      key: 'checkedInAt',
      header: 'Date & Time',
      cell: (row) => (
        <div>
          <p>{formatDate(row.checkedInAt)}</p>
          <p className="text-xs text-muted-foreground">{new Date(row.checkedInAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (row) => <Badge variant="outline">{methodLabel[row.method] ?? row.method}</Badge>,
    },
    {
      key: 'relative',
      header: '',
      hideOnMobile: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{formatRelative(row.checkedInAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {!isLoading && (!data?.checkIns || data.checkIns.length === 0) ? (
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="No check-ins"
          description="This member hasn't checked in yet."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.checkIns ?? []}
            keyExtractor={(r) => r._id}
            loading={isLoading}
            skeletonRows={10}
          />
          {data?.pagination && (
            <Pagination
              meta={data.pagination}
              onPageChange={setPage}
              onLimitChange={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Measurements Tab ─────────────────────────────────────────────────────────

function MeasurementsTab({ memberId }: { memberId: string }) {
  const { can } = usePermission();
  const { data: measurements, isLoading } = useMemberMeasurements(memberId);
  const [measureFormOpen, setMeasureFormOpen] = useState(false);

  const columns: ColumnDef<Measurement>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => formatDate(row.date),
    },
    {
      key: 'weightKg',
      header: 'Weight',
      cell: (row) => row.weightKg != null ? `${row.weightKg} kg` : '—',
    },
    {
      key: 'heightCm',
      header: 'Height',
      hideOnMobile: true,
      cell: (row) => row.heightCm != null ? `${row.heightCm} cm` : '—',
    },
    {
      key: 'bodyFatPercent',
      header: 'Body Fat',
      hideOnMobile: true,
      cell: (row) => row.bodyFatPercent != null ? `${row.bodyFatPercent}%` : '—',
    },
    {
      key: 'measurements',
      header: 'Chest / Waist',
      hideOnMobile: true,
      cell: (row) => {
        const m = row.measurements;
        if (!m) return '—';
        const parts = [
          m.chest != null ? `${m.chest}` : null,
          m.waist != null ? `${m.waist}` : null,
        ].filter(Boolean);
        return parts.length ? `${parts.join(' / ')} cm` : '—';
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {measurements?.length ?? 0} record{measurements?.length !== 1 ? 's' : ''}
        </p>
        {can('member.update') && (
          <Button size="sm" onClick={() => setMeasureFormOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Log Measurement
          </Button>
        )}
      </div>

      {!isLoading && (!measurements || measurements.length === 0) ? (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No measurements"
          description="Log a measurement to start tracking progress."
          action={can('member.update') ? { label: 'Log Measurement', onClick: () => setMeasureFormOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={measurements ?? []}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <MeasurementForm
        open={measureFormOpen}
        onOpenChange={setMeasureFormOpen}
        memberId={memberId}
      />
    </div>
  );
}

// ─── MemberDetailPage ─────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading } = useMember(memberId ?? '');

  if (isLoading) {
    return (
      <PageShell>
        <DetailHeaderSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (!data?.member) {
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

  const { member, activeSubscription } = data;

  return (
    <PageShell>
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="-ml-2 mt-0.5" onClick={() => navigate('/members')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold truncate">{member.fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <MembershipStatusBadge status={member.status} />
                {activeSubscription && (
                  <span className="text-xs text-muted-foreground">
                    {activeSubscription.plan?.name ?? 'Active Plan'} · expires {activeSubscription.endDate ? formatDate(activeSubscription.endDate) : 'ongoing'}
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

      {/* Tabs */}
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
          <ProfileTab memberId={member._id} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab memberId={member._id} />
        </TabsContent>

        <TabsContent value="checkins" className="mt-4">
          <CheckInsTab memberId={member._id} />
        </TabsContent>

        <TabsContent value="measurements" className="mt-4">
          <MeasurementsTab memberId={member._id} />
        </TabsContent>
      </Tabs>

      {/* Edit form */}
      <MemberForm
        open={editOpen}
        onOpenChange={setEditOpen}
        member={member}
      />
    </PageShell>
  );
}
