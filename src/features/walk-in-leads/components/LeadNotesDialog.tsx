import { useState } from "react";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAddWalkInLeadNote } from "../hooks/use-walkin-leads";
import type { WalkInLead } from "@/api/walkInLeads.api";

interface LeadNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: WalkInLead;
}

export default function LeadNotesDialog({ open, onOpenChange, lead }: LeadNotesDialogProps) {
  const [text, setText] = useState("");
  const addNote = useAddWalkInLeadNote(lead?._id ?? "", { onSuccess: () => setText("") });

  function handleAdd() {
    if (!text.trim()) return;
    addNote.mutate(text.trim());
  }

  const notes = lead?.notes ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notes — {lead?.fullName}</DialogTitle>
          <DialogDescription>Track conversations and follow-ups for this lead.</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8" />
              No notes yet.
            </div>
          ) : (
            [...notes]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((note) => (
                <div key={note._id} className="rounded-md border p-3 text-sm">
                  <p className="whitespace-pre-wrap">{note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.authorName} · {format(new Date(note.createdAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
              ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Add a note about this lead…"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleAdd} disabled={!text.trim() || addNote.isPending}>
            {addNote.isPending ? "Adding…" : "Add Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
