import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateNoteDto {
  memberId: string;
  sessionDate: string;
  content: string;
  visibility: 'trainer_only' | 'staff_visible' | 'member_visible';
  durationMinutes?: number;
  sessionRating?: 1 | 2 | 3 | 4 | 5;
  assignmentId?: string;
}

interface TrainerNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  memberId: string;
  memberName: string;
  assignmentId?: string;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainerNoteDialog({
  open,
  onOpenChange,
  trainerId,
  memberId,
  memberName,
  assignmentId,
  onSuccess,
}: TrainerNoteDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [content, setContent]       = useState('');
  const [visibility, setVisibility] = useState<CreateNoteDto['visibility']>('staff_visible');
  const [duration, setDuration]     = useState('');
  const [rating, setRating]         = useState<string>('');

  const NOTE_WORD_LIMIT = 35;
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = wordCount > NOTE_WORD_LIMIT;

  const mutation = useMutation({
    mutationFn: async (dto: CreateNoteDto) => {
      await api.post(`/trainers/${trainerId}/notes`, dto);
    },
    onSuccess: () => {
      toast({ title: 'Note saved', description: `Training note added for ${memberName}.` });
      // Invalidate the trainer notes list so /trainer/notes picks up the new note immediately
      qc.invalidateQueries({ queryKey: ['trainer-portal', 'notes'] });
      // Reset form
      setContent('');
      setVisibility('staff_visible');
      setDuration('');
      setRating('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save note',
        description: err?.response?.data?.message ?? 'Something went wrong.',
      });
    },
  });

  function handleSubmit() {
    if (!content.trim()) return;

    const dto: CreateNoteDto = {
      memberId,
      sessionDate: new Date().toISOString(),
      content: content.trim(),
      visibility,
      assignmentId,
    };

    if (duration) dto.durationMinutes = parseInt(duration, 10);
    if (rating)   dto.sessionRating   = parseInt(rating, 10) as 1 | 2 | 3 | 4 | 5;

    mutation.mutate(dto);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Training Note</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Recording session note for <strong>{memberName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="note-content">Session Notes *</Label>
            <Textarea
              id="note-content"
              placeholder="What did you work on? Any observations, achievements, or areas for improvement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className={overLimit ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <p className={`text-xs text-right ${overLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {wordCount} / {NOTE_WORD_LIMIT} words
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="note-duration">Duration (min)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="note-duration">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 75, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label htmlFor="note-rating">Session Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger id="note-rating">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
                    { value: '4', label: '⭐⭐⭐⭐ Good' },
                    { value: '3', label: '⭐⭐⭐ Average' },
                    { value: '2', label: '⭐⭐ Below Average' },
                    { value: '1', label: '⭐ Poor' },
                  ].map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <Label htmlFor="note-visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as CreateNoteDto['visibility'])}
            >
              <SelectTrigger id="note-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trainer_only">Trainer only (private)</SelectItem>
                <SelectItem value="staff_visible">Staff & trainer</SelectItem>
                <SelectItem value="member_visible">Member can see</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || overLimit || mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
