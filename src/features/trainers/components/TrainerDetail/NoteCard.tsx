import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/utils/format";
import type { TrainingNote, NoteVisibility } from "@/types/trainer.types";
import Stars from "./Stars";

// ─── Constants ────────────────────────────────────────────────────────────────

export const VISIBILITY_LABEL: Record<NoteVisibility, string> = {
  trainer_only: "Trainer Only",
  staff_visible: "Staff Visible",
  member_visible: "Member Visible",
};

export const VISIBILITY_VARIANT: Record<NoteVisibility, "outline" | "secondary" | "default"> = {
  trainer_only: "outline",
  staff_visible: "secondary",
  member_visible: "default",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NoteCard({ note }: { note: TrainingNote }) {
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
                <Clock className="h-3 w-3" />
                {note.durationMinutes} min
              </p>
            )}
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        {(note.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
