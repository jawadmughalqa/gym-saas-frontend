import { useState } from 'react';
import { Users, Search, Dumbbell, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/format';
import {
  useMyTrainerProfile,
  useMyAssignments,
  type TrainerAssignmentItem,
  type AssignedMember,
} from './hooks/use-trainer-portal';
import TrainerNoteDialog from './TrainerNoteDialog';

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

function memberInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Client card ──────────────────────────────────────────────────────────────

function ClientCard({
  assignment,
  trainerId,
  onNoteAdded,
}: {
  assignment: TrainerAssignmentItem;
  trainerId: string;
  onNoteAdded: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const member = memberObj(assignment.memberId);
  const name   = memberName(assignment.memberId);
  const memberId = member?._id ?? (typeof assignment.memberId === 'string' ? assignment.memberId : '');

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-4">
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {memberInitials(name)}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{name}</p>
                {member?.email && (
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                )}
              </div>
            </div>
            <Badge
              className={
                assignment.status === 'active'
                  ? 'bg-green-500/15 text-green-500 border-green-500/25 hover:bg-green-500/15 shrink-0'
                  : 'shrink-0'
              }
              variant={assignment.status === 'active' ? 'outline' : 'secondary'}
            >
              {assignment.status === 'active' ? 'Active' : 'Ended'}
            </Badge>
          </div>

          {/* ── Details ── */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Since {formatDate(assignment.startDate)}</span>
            </div>
            {assignment.monthlyCharge !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {assignment.currency ?? 'USD'}{' '}
                  {assignment.monthlyCharge.toLocaleString()} / mo
                </span>
              </div>
            )}
            {assignment.sessionFrequencyPerWeek && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell className="h-3.5 w-3.5 shrink-0" />
                <span>{assignment.sessionFrequencyPerWeek}x per week</span>
              </div>
            )}
            {assignment.goal && (
              <div className="col-span-2 text-muted-foreground">
                <span className="text-foreground font-medium">Goal: </span>
                {assignment.goal}
              </div>
            )}
          </div>

          {/* ── Actions (active only) ── */}
          {assignment.status === 'active' && memberId && (
            <div className="mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="text-xs text-primary font-medium hover:underline"
              >
                + Add training note
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {assignment.status === 'active' && memberId && (
        <TrainerNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          trainerId={trainerId}
          memberId={memberId}
          memberName={name}
          assignmentId={assignment._id}
          onSuccess={onNoteAdded}
        />
      )}
    </>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ClientsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainerClientsPage() {
  const { data: profile, isLoading: loadingProfile } = useMyTrainerProfile();
  const { data: assignments = [], isLoading: loadingAssignments, refetch } =
    useMyAssignments(profile?._id);

  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'active' | 'all'>('active');

  const isLoading = loadingProfile || loadingAssignments;

  // Filter by tab
  const filtered = assignments
    .filter((a) => tab === 'active' ? a.status === 'active' : true)
    .filter((a) => {
      if (!search.trim()) return true;
      const name = memberName(a.memberId).toLowerCase();
      const goal = (a.goal ?? '').toLowerCase();
      const q    = search.toLowerCase();
      return name.includes(q) || goal.includes(q);
    });

  const activeCount = assignments.filter((a) => a.status === 'active').length;
  const totalCount  = assignments.length;

  return (
    <PageShell>
      <PageHeader
        title="My Clients"
        subtitle="All members assigned to you for personal training."
      />

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'all')}>
          <TabsList>
            <TabsTrigger value="active">
              Active
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {activeCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {totalCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or goal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <ClientsSkeleton />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          <p className="text-xs mt-1">
            {search
              ? 'Try a different name or goal.'
              : 'Clients assigned to you will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <ClientCard
              key={a._id}
              assignment={a}
              trainerId={profile?._id ?? ''}
              onNoteAdded={() => refetch()}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
