import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Search,
  Star,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/format';
import { api } from '@/lib/axios';
import { useMyTrainerProfile } from './hooks/useTrainerPortal';
import TrainerNoteDialog from './TrainerNoteDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteAuthor {
  _id: string;
  firstName?: string;
  lastName?: string;
}

interface NoteMember {
  _id: string;
  firstName?: string;
  lastName?: string;
}

interface TrainingNote {
  _id: string;
  memberId: NoteMember | string;
  content: string;
  sessionDate: string;
  visibility: 'trainer_only' | 'staff_visible' | 'member_visible';
  durationMinutes?: number;
  sessionRating?: number;
  tags?: string[];
  createdAt: string;
}

interface NotesResponse {
  success: boolean;
  data: {
    notes: TrainingNote[];
    total: number;
    page: number;
    limit: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberName(m: NoteMember | string | undefined): string {
  if (!m) return 'Unknown';
  if (typeof m === 'string') return 'Member';
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Member';
}

function visibilityLabel(v: string) {
  switch (v) {
    case 'trainer_only':   return { label: 'Private',      icon: EyeOff, color: 'text-orange-500' };
    case 'staff_visible':  return { label: 'Staff',        icon: Eye,    color: 'text-blue-500' };
    case 'member_visible': return { label: 'Visible to member', icon: Eye, color: 'text-green-600' };
    default:               return { label: v, icon: Eye, color: 'text-muted-foreground' };
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: TrainingNote }) {
  const vis = visibilityLabel(note.visibility);
  const VisIcon = vis.icon;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-medium">{memberName(note.memberId)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(note.sessionDate)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {note.sessionRating && <StarRating rating={note.sessionRating} />}
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed mb-3">{note.content}</p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {note.durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {note.durationMinutes} min
            </span>
          )}
          <span className={`flex items-center gap-1 ${vis.color}`}>
            <VisIcon className="h-3.5 w-3.5" />
            {vis.label}
          </span>
          {note.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrainerNotesPage() {
  const { data: profile, isLoading: loadingProfile } = useMyTrainerProfile();
  const [search, setSearch]   = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const trainerId = profile?._id;

  const { data: notesData, isLoading: loadingNotes, refetch } = useQuery({
    queryKey: ['trainer-portal', 'notes', trainerId],
    queryFn: async () => {
      const res = await api.get<NotesResponse>(`/trainers/${trainerId}/notes`, {
        params: { limit: 50 },
      });
      return res.data.data;
    },
    enabled: !!trainerId,
  });

  const isLoading = loadingProfile || loadingNotes;
  const notes = notesData?.notes ?? [];

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const name    = memberName(n.memberId).toLowerCase();
    const content = n.content.toLowerCase();
    const q       = search.toLowerCase();
    return name.includes(q) || content.includes(q);
  });

  return (
    <PageShell>
      <PageHeader
        title="Training Notes"
        subtitle="All session notes you've recorded for your clients."
        actions={
          trainerId ? (
            <Button size="sm" onClick={() => setNoteOpen(true)}>
              + Add Note
            </Button>
          ) : undefined
        }
      />

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes or client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* ── Notes ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">
            {search ? 'No notes match your search' : 'No training notes yet'}
          </p>
          {!search && (
            <p className="text-xs mt-1">
              Start recording session notes from your clients page.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <NoteCard key={note._id} note={note} />
          ))}
        </div>
      )}

      {/* Quick-add note dialog (no pre-selected member) */}
      {trainerId && (
        <TrainerNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          trainerId={trainerId}
          memberId=""
          memberName="client"
          onSuccess={() => refetch()}
        />
      )}
    </PageShell>
  );
}
