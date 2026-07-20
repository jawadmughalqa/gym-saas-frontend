import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetBranches } from "@/api/generated/branches/branches";
import { UserCombobox } from "@/components/ui/UserCombobox";
import { useCreateWalkInLead, useUpdateWalkInLead } from "../hooks/use-walkin-leads";
import type { WalkInLead, WalkInLeadSource } from "@/api/walkInLeads.api";
import { PhoneInput } from "@/components/ui/phone-input";
import { useTenantPhoneCountry } from "@/hooks/use-tenant-phone-country";


// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

const TODAY = toDateStr(new Date());
const FOLLOW_UP_DEFAULT = toDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

// ─── Constants ────────────────────────────────────────────────────────────────

export const SOURCE_LABELS: Record<WalkInLeadSource, string> = {
  walk_in: "Walk-in",
  referral: "Referral",
  social_media: "Social Media",
  website: "Website",
  phone_inquiry: "Phone Inquiry",
  event: "Event",
  other: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  trial_scheduled: "Trial Scheduled",
  converted: "Converted",
  lost: "Lost",
};

const EDITABLE_STATUSES = ["new", "contacted", "follow_up", "trial_scheduled", "lost"] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    branchId: z.string().min(1, "Branch is required"),
    fullName: z.string().min(1, "Name is required").max(200),
    phone: z.string().min(5, "Phone is required").max(50),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    gender: z.string().optional(),
    source: z.string().min(1),
    interestedIn: z.string().max(200).optional(),
    status: z.string().min(1),
    assignedTo: z.string().optional(),
    followUpDate: z.string().optional(),
    visitDate: z.string().optional(),
    note: z.string().max(2000).optional(),
    lostReason: z.string().max(500).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.status === "lost" && (!d.lostReason || d.lostReason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a reason for marking this lead as lost",
        path: ["lostReason"],
      });
    }
  });

type FormValues = z.input<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface WalkInLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: WalkInLead;
}

export default function WalkInLeadForm({ open, onOpenChange, lead }: WalkInLeadFormProps) {
  const isEditing = !!lead;

  const { countryCode: phoneIsoCode } = useTenantPhoneCountry();

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const createLead = useCreateWalkInLead({ onSuccess: () => onOpenChange(false) });
  const updateLead = useUpdateWalkInLead(lead?._id ?? "", { onSuccess: () => onOpenChange(false) });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: "",
      fullName: "",
      phone: "",
      email: "",
      gender: "",
      source: "walk_in",
      interestedIn: "",
      status: "new",
      assignedTo: "",
      followUpDate: FOLLOW_UP_DEFAULT,
      visitDate: TODAY,
      note: "",
      lostReason: "",
    },
  });

  const statusValue = watch("status");
  const selectedBranchId = watch("branchId");

  useEffect(() => {
    if (lead) {
      reset({
        branchId: typeof lead.branchId === "string" ? lead.branchId : lead.branchId._id,
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email ?? "",
        gender: lead.gender ?? "",
        source: lead.source,
        interestedIn: lead.interestedIn ?? "",
        status: lead.status,
        assignedTo: lead.assignedTo
          ? typeof lead.assignedTo === "string"
            ? lead.assignedTo
            : lead.assignedTo._id
          : "",
        followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 10) : "",
        visitDate: lead.visitDate ? lead.visitDate.slice(0, 10) : "",
        note: "",
        lostReason: lead.lostReason ?? "",
      });
    } else {
      reset({
        branchId: branches[0]?._id ?? "",
        fullName: "",
        phone: "",
        email: "",
        gender: "",
        source: "walk_in",
        interestedIn: "",
        status: "new",
        assignedTo: "",
        followUpDate: FOLLOW_UP_DEFAULT,
        visitDate: TODAY,
        note: "",
        lostReason: "",
      });
    }
  }, [lead, open, reset, branches]);

  // Reset assignedTo when branch changes so stale selection doesn't linger
  useEffect(() => {
    setValue("assignedTo", "");
  }, [selectedBranchId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (isEditing) {
      await updateLead.mutateAsync({
        branchId: values.branchId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        gender: (values.gender || undefined) as
          | "male"
          | "female"
          | "other"
          | "prefer_not_to_say"
          | undefined,
        source: values.source as WalkInLeadSource,
        interestedIn: values.interestedIn || undefined,
        status: values.status as "new" | "contacted" | "follow_up" | "trial_scheduled" | "lost",
        assignedTo: values.assignedTo || undefined,
        followUpDate: values.followUpDate
          ? new Date(values.followUpDate).toISOString()
          : undefined,
        visitDate: values.visitDate ? new Date(values.visitDate).toISOString() : undefined,
        lostReason: values.status === "lost" ? values.lostReason : undefined,
      });
    } else {
      await createLead.mutateAsync({
        branchId: values.branchId,
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        gender: (values.gender || undefined) as
          | "male"
          | "female"
          | "other"
          | "prefer_not_to_say"
          | undefined,
        source: values.source as WalkInLeadSource,
        interestedIn: values.interestedIn || undefined,
        status: values.status as "new" | "contacted" | "follow_up" | "trial_scheduled",
        assignedTo: values.assignedTo || undefined,
        followUpDate: values.followUpDate
          ? new Date(values.followUpDate).toISOString()
          : undefined,
        visitDate: values.visitDate ? new Date(values.visitDate).toISOString() : undefined,
        note: values.note || undefined,
      });
    }
  });

  const isPending = createLead.isPending || updateLead.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{isEditing ? "Edit Walk-in Lead" : "Add Walk-in Lead"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this prospect's details and follow-up status."
              : "Log a new walk-in visitor or prospect."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5">
        <form id="walkin-form" onSubmit={onSubmit} className="space-y-5">
          {/* Branch */}
          <div className="space-y-1.5">
            <Label htmlFor="branchId">
              Branch <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("branchId")}
              onValueChange={(v) => setValue("branchId", v, { shouldValidate: true })}
            >
              <SelectTrigger id="branchId" className={errors.branchId ? "border-destructive" : ""}>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="e.g. Ayesha Khan"
              {...register("fullName")}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                id="phone"
                value={watch("phone") ?? ""}
                onChange={(v) => setValue("phone", v, { shouldValidate: true })}
                defaultCountry={phoneIsoCode}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="optional@email.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          {/* Gender + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select value={watch("gender") || ""} onValueChange={(v) => setValue("gender", v)}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interested in */}
          <div className="space-y-1.5">
            <Label htmlFor="interestedIn">Interested In</Label>
            <Input
              id="interestedIn"
              placeholder="e.g. Gold Membership, Weight Loss"
              {...register("interestedIn")}
            />
          </div>

          {/* Status + Assigned to */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <UserCombobox
                value={watch("assignedTo")}
                onChange={(id) => setValue("assignedTo", id)}
                placeholder="Unassigned"
                branchId={selectedBranchId || undefined}
              />
            </div>
          </div>

          {/* Lost reason (only when status === lost) */}
          {statusValue === "lost" && (
            <div className="space-y-1.5">
              <Label htmlFor="lostReason">
                Reason for Loss <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="lostReason"
                placeholder="e.g. Too expensive, chose another gym…"
                rows={2}
                {...register("lostReason")}
                className={errors.lostReason ? "border-destructive" : ""}
              />
              {errors.lostReason && (
                <p className="text-xs text-destructive">{errors.lostReason.message}</p>
              )}
            </div>
          )}

          {/* Visit date + Follow-up date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="visitDate">Visit Date</Label>
              <DatePicker
                id="visitDate"
                value={watch("visitDate") ?? ''}
                onChange={(v) => setValue("visitDate", v ?? '')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <DatePicker
                id="followUpDate"
                value={watch("followUpDate") ?? ''}
                onChange={(v) => setValue("followUpDate", v ?? '')}
              />
            </div>
          </div>

          {/* Initial note — create only */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Anything worth remembering about this visit…"
                rows={2}
                {...register("note")}
              />
            </div>
          )}

        </form>
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="walkin-form" className="flex-1" disabled={isPending || isSubmitting}>
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Add Lead"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
