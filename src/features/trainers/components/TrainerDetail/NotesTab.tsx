import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import { usePermission } from "@/hooks/use-permission";
import { useGetTrainersTrainerIdNotes } from "@/api/generated/trainers/trainers";
import type { TrainingNote } from "@/types/trainer.types";
import NoteCard from "./NoteCard";
import TrainingNoteDialog from "./TrainingNoteDialog";

export default function NotesTab({ trainerId }: { trainerId: string }) {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useGetTrainersTrainerIdNotes(trainerId, { page, limit });
  const notes = (data?.data ?? []) as TrainingNote[];
  const pagination = data?.pagination;
  const totalNotes = pagination?.total ?? 0;

  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalNotes} session note{totalNotes !== 1 ? "s" : ""}
        </p>
        {can("training_note.create") && (
          <Button size="sm" onClick={() => setNoteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Note
          </Button>
        )}
      </div>

      {!isLoading && notes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No session notes"
          description="Log notes after each training session."
          action={
            can("training_note.create")
              ? { label: "Log Note", onClick: () => setNoteOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-md border bg-muted/30 animate-pulse" />
              ))
            : notes.map((note) => <NoteCard key={note._id} note={note} />)}

          {pagination && (
            <Pagination meta={pagination} onPageChange={setPage} onLimitChange={() => {}} />
          )}
        </div>
      )}

      <TrainingNoteDialog trainerId={trainerId} open={noteOpen} onOpenChange={setNoteOpen} />
    </div>
  );
}
