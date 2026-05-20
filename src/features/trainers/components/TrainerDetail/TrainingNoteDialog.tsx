import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetTrainersTrainerIdAssignments,
  usePostTrainersTrainerIdNotes,
  getGetTrainersTrainerIdNotesQueryKey,
} from "@/api/generated/trainers/trainers";
import { useQueryClient } from "@tanstack/react-query";

// ─── Schema ───────────────────────────────────────────────────────────────────

const noteSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  sessionDate: z.string().min(1, "Session date is required"),
  content: z.string().min(1, "Content is required").max(3000),
  visibility: z
    .enum(["trainer_only", "staff_visible", "member_visible"])
    .default("staff_visible"),
  durationMinutes: z.coerce.number().int().positive().optional(),
  sessionRating: z.coerce.number().int().min(1).max(5).optional(),
  tags: z.string().optional(),
});
type NoteFormValues = z.infer<typeof noteSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  trainerId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function TrainingNoteDialog({ trainerId, open, onOpenChange }: Props) {
  const { data: assignmentsData } = useGetTrainersTrainerIdAssignments(trainerId);
  const assignedMembers = (assignmentsData?.data ?? [])
    .filter((a) => a.status === "active")
    .map((a) => a.memberId);

  const qc = useQueryClient();

  const create = usePostTrainersTrainerIdNotes({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: getGetTrainersTrainerIdNotesQueryKey(trainerId),
        });
        reset();
        onOpenChange(false);
      },
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { visibility: "staff_visible" },
  });

  function onSubmit(values: NoteFormValues) {
    create.mutate({
      trainerId,
      data: {
        memberId: values.memberId,
        sessionDate: values.sessionDate,
        content: values.content,
        visibility: values.visibility,
        durationMinutes: values.durationMinutes,
        sessionRating: values.sessionRating,
        tags: values.tags
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      },
    });
  }

  const contentValue = watch("content") ?? "";
  const wordCount = contentValue.trim() === "" ? 0 : contentValue.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = wordCount > 35;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Training Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member + Session Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <Select
                value={watch("memberId")}
                onValueChange={(v) => setValue("memberId", v, { shouldValidate: true })}
                disabled={create.isPending}
              >
                <SelectTrigger className={errors.memberId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a member..." />
                </SelectTrigger>
                <SelectContent>
                  {assignedMembers?.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No assigned members found
                    </div>
                  ) : (
                    assignedMembers?.map((member) => (
                      <SelectItem key={member?._id} value={member?._id}>
                        {member?.firstName} {member?.lastName}
                        <span className="ml-1 text-xs text-muted-foreground">· {member?.email}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.memberId && (
                <p className="text-xs text-destructive">{errors.memberId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Session Date *</Label>
              <Input
                type="datetime-local"
                disabled={create.isPending}
                className={errors.sessionDate ? "border-destructive" : ""}
                {...register("sessionDate")}
              />
              {errors.sessionDate && (
                <p className="text-xs text-destructive">{errors.sessionDate.message}</p>
              )}
            </div>
          </div>

          {/* Note content */}
          <div className="space-y-1.5">
            <Label>Note *</Label>
            <Textarea
              rows={5}
              placeholder="Session observations, progress notes…"
              disabled={create.isPending}
              className={errors.content ? "border-destructive" : ""}
              {...register("content")}
            />
            <div className="flex items-center justify-between">
              {errors.content ? (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              ) : (
                <span />
              )}
              <p className={`text-xs ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {wordCount} / 35 words
              </p>
            </div>
          </div>

          {/* Visibility + Duration + Rating */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select
                value={watch("visibility")}
                onValueChange={(v) => setValue("visibility", v as NoteFormValues["visibility"])}
                disabled={create.isPending}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trainer_only">Trainer Only</SelectItem>
                  <SelectItem value="staff_visible">Staff Visible</SelectItem>
                  <SelectItem value="member_visible">Member Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={1}
                placeholder="60"
                disabled={create.isPending}
                {...register("durationMinutes")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session Rating</Label>
              <Input
                type="number"
                min={1}
                max={5}
                placeholder="1–5"
                disabled={create.isPending}
                {...register("sessionRating")}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Input
              placeholder="strength, cardio, injury-concern"
              disabled={create.isPending}
              {...register("tags")}
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || overLimit}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
