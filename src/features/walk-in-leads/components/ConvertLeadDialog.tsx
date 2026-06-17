import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConvertWalkInLead } from "../hooks/use-walkin-leads";
import { toast } from "@/hooks/use-toast";
import type { WalkInLead, ConvertWalkInLeadResult } from "@/api/walkInLeads.api";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  age: z.string().optional(),
  consentMarketing: z.boolean().default(false),
  consentDataProcessing: z.boolean().default(false),
});

type FormValues = z.input<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: WalkInLead;
}

export default function ConvertLeadDialog({ open, onOpenChange, lead }: ConvertLeadDialogProps) {
  const [result, setResult] = useState<ConvertWalkInLeadResult | null>(null);
  const convertLead = useConvertWalkInLead(lead?._id ?? "", {
    onSuccess: (res) => setResult(res),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      age: "",
      consentMarketing: false,
      consentDataProcessing: false,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: lead?.email ?? "",
        age: "",
        consentMarketing: false,
        consentDataProcessing: false,
      });
      setResult(null);
    }
  }, [open, lead, reset]);

  const needsEmail = !lead?.email;

  const onSubmit = handleSubmit(async (values) => {
    await convertLead.mutateAsync({
      email: values.email || undefined,
      age: values.age ? Number(values.age) : undefined,
      consentMarketing: values.consentMarketing,
      consentDataProcessing: values.consentDataProcessing,
    });
  });

  function copyCredentials() {
    if (!result) return;
    const text = `Email: ${result.loginEmail}\nTemporary Password: ${result.tempPassword}`;
    void navigator.clipboard.writeText(text);
    toast({ title: "Credentials copied to clipboard" });
  }

  function handleClose(next: boolean) {
    if (!next) setResult(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Lead converted to member
              </DialogTitle>
              <DialogDescription>
                {lead?.fullName} is now a member. Share these login credentials with them.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-md border bg-muted/40 p-3">
              <div>
                <Label className="text-xs text-muted-foreground">Login Email</Label>
                <p className="font-mono text-sm">{result.loginEmail}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <p className="font-mono text-sm">{result.tempPassword}</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={copyCredentials}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Convert to Member</DialogTitle>
              <DialogDescription>
                Convert {lead?.fullName} into a paying member. A member account and login
                credentials will be created.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              {needsEmail && (
                <div className="space-y-1.5">
                  <Label htmlFor="convert-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="convert-email"
                    type="email"
                    placeholder="member@email.com"
                    {...register("email")}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    This lead has no email on file. An email is required to create the member's
                    login account.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="convert-age">Age</Label>
                <Input id="convert-age" type="number" min={1} max={120} {...register("age")} />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="consentData"
                  checked={watch("consentDataProcessing")}
                  onCheckedChange={(v) => setValue("consentDataProcessing", !!v)}
                />
                <Label htmlFor="consentData" className="text-sm font-normal">
                  Member consents to data processing
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="consentMarketing"
                  checked={watch("consentMarketing")}
                  onCheckedChange={(v) => setValue("consentMarketing", !!v)}
                />
                <Label htmlFor="consentMarketing" className="text-sm font-normal">
                  Member consents to marketing communications
                </Label>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={convertLead.isPending}>
                  {convertLead.isPending ? "Converting…" : "Convert to Member"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
