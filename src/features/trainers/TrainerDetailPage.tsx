import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Users, FileText, Star,
  Edit, AlertCircle, Loader2, Plus, Clock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DetailHeaderSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Pagination from '@/components/shared/Pagination';
import { useConfirm } from '@/hooks/use-confirm';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  useTrainer, useTrainerAssignments, useTrainerNotes, useTrainerRatings,
  useEndAssignment, useCreateAssignment, useCreateNote,
} from './hooks/use-trainers';
import TrainerForm from './components/TrainerForm';
import type {
  TrainerAssignment, TrainingNote, TrainerRating,
  AssignmentStatus, NoteVisibility,
} from '@/types/trainer.types';

// ─── Day names ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Star rating display ──────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ trainerId }: { trainerId: string }) {
  const { data: trainer, isLoading } = useTrainer(trainerId);
  if (isLoading) return <CardSkeleton />;
  if (!trainer) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trainer.bio && <p className="text-sm">{trainer.bio}</p>}
          {trainer.experienceYears != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
              <p className="text-sm font-medium">{trainer.experienceYears} year{trainer.experienceYears !== 1 ? 's' : ''}</p>
            </div>
          )}
          {trainer.hourlyRate != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Hourly Rate</p>
              <p className="text-sm font-medium">{trainer.currency} {trainer.hourlyRate}/hr</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Client Capacity</p>
            <p className="text-sm font-medium">
              {trainer.currentClientCount} / {trainer.maxClients} clients
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rating</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars value={Math.round(trainer.ratingAvg)} />
              <span className="text-sm text-muted-foreground">
                {trainer.ratingAvg > 0 ? `${trainer.ratingAvg.toFixed(1)} (${trainer.ratingCount})` : 'No ratings yet'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Skills & Certifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Specializations</p>
            {trainer.specializations.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {trainer.specializations.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground italic">None listed</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Certifications</p>
            {trainer.certifications.length > 0 ? (
              <ul className="space-y-1">
                {trainer.certifications.map((c) => (
                  <li key={c} className="text-sm flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground italic">None listed</p>}
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weekly Availability</CardTitle>
        </CardHeader>
        <CardContent>
          {trainer.availability.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {trainer.availability.map((slot, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{DAY_NAMES[slot.day]}</p>
                  <p className="text-xs text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No availability set.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

const ASSIGNMENT_VARIANT: Record<AssignmentStatus, 'success' | 'warning' | 'secondary'> = {
  active: 'success',
  paused: 'warning',
  ended:  'secondary',
};

function AssignmentsTab({ trainerId }: { trainerId: string }) {
  const { can } = usePermission();
  const { data: assignments, isLoading } = useTrainerAssignments(trainerId);
  const [assignOpen, setAssignOpen] = useState(false);
  const { confirm, confirmProps } = useConfirm();
  const end = useEndAssignment(trainerId);

  const columns: ColumnDef<TrainerAssignment>[] = [
    {
      key: 'memberId',
      header: 'Member',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.memberId.firstName} {row.memberId.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.memberId.email}</p>
        </div>
      ),
    },
    {
      key: 'goal',
      header: 'Goal',
      hideOnMobile: true,
      cell: (row) => row.goal ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'sessionFrequencyPerWeek',
      header: 'Freq / week',
      hideOnMobile: true,
      cell: (row) => row.sessionFrequencyPerWeek ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'startDate',
      header: 'Started',
      hideOnMobile: true,
      cell: (row) => formatDate(row.startDate),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={ASSIGNMENT_VARIANT[row.status]}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-20',
      cell: (row) => row.status === 'active' && can('trainer.assign') ? (
        <div className="flex justify-end">
          <Button
            variant="ghost" size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              confirm(
                { title: `End assignment with ${row.memberId.firstName}?`, description: 'This will end the assignment and free up a client slot.', variant: 'destructive', confirmLabel: 'End Assignment' },
                () => end.mutate({ assignmentId: row._id, body: { reason: 'Ended by staff' } }),
              );
            }}
          >
            End
          </Button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assignments?.filter((a) => a.status === 'active').length ?? 0} active assignment{assignments?.filter((a) => a.status === 'active').length !== 1 ? 's' : ''}
        </p>
        {can('trainer.assign') && (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Member
          </Button>
        )}
      </div>

      {!isLoading && (!assignments || assignments.length === 0) ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No assignments"
          description="Assign a member to this trainer to get started."
          action={can('trainer.assign') ? { label: 'Assign Member', onClick: () => setAssignOpen(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={assignments ?? []}
          keyExtractor={(r) => r._id}
          loading={isLoading}
          skeletonRows={5}
        />
      )}

      <AssignMemberDialog trainerId={trainerId} open={assignOpen} onOpenChange={setAssignOpen} />
      <ConfirmDialog {...confirmProps} loading={end.isPending} />
    </div>
  );
}

// ─── Assign Member Dialog ─────────────────────────────────────────────────────

const assignSchema = z.object({
  memberId:               z.string().min(1, 'Member ID is required'),
  branchId:               z.string().min(1, 'Branch ID is required'),
  goal:                   z.string().max(300).optional(),
  sessionFrequencyPerWeek: z.coerce.number().int().min(1).max(14).optional(),
  notes:                  z.string().optional(),
  startDate:              z.string().optional(),
});
type AssignFormValues = z.infer<typeof assignSchema>;

function AssignMemberDialog({ trainerId, open, onOpenChange }: {
  trainerId: string; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const assign = useCreateAssignment(trainerId, { onSuccess: () => onOpenChange(false) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
  });

  function onSubmit(values: AssignFormValues) {
    assign.mutate({
      memberId: values.memberId,
      branchId: values.branchId,
      goal: values.goal || undefined,
      sessionFrequencyPerWeek: values.sessionFrequencyPerWeek,
      notes: values.notes || undefined,
      startDate: values.startDate || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Assign Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Member ID *</Label>
            <Input placeholder="Member ID" disabled={assign.isPending} className={errors.memberId ? 'border-destructive' : ''} {...register('memberId')} />
            {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Branch ID *</Label>
            <Input placeholder="Branch ID" disabled={assign.isPending} className={errors.branchId ? 'border-destructive' : ''} {...register('branchId')} />
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Goal</Label>
            <Input placeholder="e.g. Weight loss" disabled={assign.isPending} {...register('goal')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sessions / week</Label>
              <Input type="number" min={1} max={14} placeholder="e.g. 3" disabled={assign.isPending} {...register('sessionFrequencyPerWeek')} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" disabled={assign.isPending} {...register('startDate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional…" disabled={assign.isPending} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>Cancel</Button>
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

const VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  trainer_only:   'Trainer Only',
  staff_visible:  'Staff Visible',
  member_visible: 'Member Visible',
};
const VISIBILITY_VARIANT: Record<NoteVisibility, 'outline' | 'secondary' | 'default'> = {
  trainer_only:   'outline',
  staff_visible:  'secondary',
  member_visible: 'default',
};

function NotesTab({ trainerId }: { trainerId: string }) {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTrainerNotes(trainerId, { page, limit: 15 });
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.pagination.total ?? 0} session note{data?.pagination.total !== 1 ? 's' : ''}</p>
        {can('training_note.create') && (
          <Button size="sm" onClick={() => setNoteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Note
          </Button>
        )}
      </div>

      {!isLoading && (!data?.notes || data.notes.length === 0) ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No session notes"
          description="Log notes after each training session."
          action={can('training_note.create') ? { label: 'Log Note', onClick: () => setNoteOpen(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-md border bg-muted/30 animate-pulse" />
              ))
            : data?.notes.map((note) => (
                <NoteCard key={note._id} note={note} trainerId={trainerId} />
              ))}
          {data?.pagination && (
            <Pagination meta={data.pagination} onPageChange={setPage} onLimitChange={() => {}} />
          )}
        </div>
      )}

      <TrainingNoteDialog trainerId={trainerId} open={noteOpen} onOpenChange={setNoteOpen} />
    </div>
  );
}

function NoteCard({ note, trainerId }: { note: TrainingNote; trainerId: string }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">
              {note.memberId.firstName} {note.memberId.lastName}
            </p>
            <Badge variant={VISIBILITY_VARIANT[note.visibility]} className="text-xs">
              {VISIBILITY_LABEL[note.visibility]}
            </Badge>
            {note.sessionRating && <Stars value={note.sessionRating} />}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">{formatDate(note.sessionDate)}</p>
            {note.durationMinutes && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />{note.durationMinutes} min
              </p>
            )}
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Training Note Dialog ─────────────────────────────────────────────────────

const noteSchema = z.object({
  memberId:        z.string().min(1, 'Member ID is required'),
  sessionDate:     z.string().min(1, 'Session date is required'),
  content:         z.string().min(1, 'Content is required').max(3000),
  visibility:      z.enum(['trainer_only', 'staff_visible', 'member_visible']).default('staff_visible'),
  durationMinutes: z.coerce.number().int().positive().optional(),
  sessionRating:   z.coerce.number().int().min(1).max(5).optional(),
  tags:            z.string().optional(), // comma-separated in form, split on submit
});
type NoteFormValues = z.infer<typeof noteSchema>;

function TrainingNoteDialog({ trainerId, open, onOpenChange }: {
  trainerId: string; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateNote(trainerId, { onSuccess: () => onOpenChange(false) });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { visibility: 'staff_visible' },
  });

  function onSubmit(values: NoteFormValues) {
    create.mutate({
      memberId:        values.memberId,
      sessionDate:     values.sessionDate,
      content:         values.content,
      visibility:      values.visibility,
      durationMinutes: values.durationMinutes,
      sessionRating:   values.sessionRating,
      tags:            values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log Training Note</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Member ID *</Label>
              <Input disabled={create.isPending} className={errors.memberId ? 'border-destructive' : ''} {...register('memberId')} />
              {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Session Date *</Label>
              <Input type="datetime-local" disabled={create.isPending} className={errors.sessionDate ? 'border-destructive' : ''} {...register('sessionDate')} />
              {errors.sessionDate && <p className="text-xs text-destructive">{errors.sessionDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note *</Label>
            <Textarea rows={5} placeholder="Session observations, progress notes…" disabled={create.isPending} className={errors.content ? 'border-destructive' : ''} {...register('content')} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={watch('visibility')} onValueChange={(v) => setValue('visibility', v as NoteFormValues['visibility'])} disabled={create.isPending}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trainer_only">Trainer Only</SelectItem>
                  <SelectItem value="staff_visible">Staff Visible</SelectItem>
                  <SelectItem value="member_visible">Member Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={1} placeholder="60" disabled={create.isPending} {...register('durationMinutes')} />
            </div>
            <div className="space-y-1.5">
              <Label>Session Rating</Label>
              <Input type="number" min={1} max={5} placeholder="1–5" disabled={create.isPending} {...register('sessionRating')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input placeholder="strength, cardio, injury-concern" disabled={create.isPending} {...register('tags')} />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ratings Tab ──────────────────────────────────────────────────────────────

function RatingsTab({ trainerId }: { trainerId: string }) {
  const { data: ratings, isLoading } = useTrainerRatings(trainerId);

  if (isLoading) return <CardSkeleton />;

  if (!ratings || ratings.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-10 w-10" />}
        title="No ratings yet"
        description="Ratings appear here once members submit reviews."
      />
    );
  }

  return (
    <div className="space-y-3">
      {ratings.map((rating) => (
        <RatingCard key={rating._id} rating={rating} />
      ))}
    </div>
  );
}

function RatingCard({ rating }: { rating: TrainerRating }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">
              {rating.memberId.firstName} {rating.memberId.lastName}
            </p>
            <Stars value={rating.rating} />
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(rating.createdAt)}</p>
        </div>
        {rating.review && <p className="text-sm text-muted-foreground">{rating.review}</p>}
      </CardContent>
    </Card>
  );
}

// ─── TrainerDetailPage ────────────────────────────────────────────────────────

export default function TrainerDetailPage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const { data: trainer, isLoading } = useTrainer(trainerId ?? '');

  const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'warning'> = {
    active:   'success',
    inactive: 'secondary',
    on_leave: 'warning',
  };

  if (isLoading) {
    return (
      <PageShell>
        <DetailHeaderSkeleton />
        <CardSkeleton />
      </PageShell>
    );
  }

  if (!trainer) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Trainer not found</h2>
          <Button variant="outline" onClick={() => navigate('/trainers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trainers
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="-ml-2 mt-0.5" onClick={() => navigate('/trainers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {trainer.userId.firstName} {trainer.userId.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={STATUS_VARIANT[trainer.status]}>
                  {trainer.status === 'on_leave' ? 'On Leave' : trainer.status.charAt(0).toUpperCase() + trainer.status.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground">{trainer.userId.email}</span>
                {trainer.userId.phone && (
                  <span className="text-sm text-muted-foreground">· {trainer.userId.phone}</span>
                )}
              </div>
            </div>

            {can('trainer.update') && (
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
          <TabsTrigger value="assignments" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Session Notes</span>
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-1.5">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Ratings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab trainerId={trainer._id} />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <AssignmentsTab trainerId={trainer._id} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab trainerId={trainer._id} />
        </TabsContent>
        <TabsContent value="ratings" className="mt-4">
          <RatingsTab trainerId={trainer._id} />
        </TabsContent>
      </Tabs>

      <TrainerForm open={editOpen} onOpenChange={setEditOpen} trainer={trainer} />
    </PageShell>
  );
}
