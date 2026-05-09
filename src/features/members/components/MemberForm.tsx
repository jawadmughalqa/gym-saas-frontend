import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCreateMember, useUpdateMember } from '../hooks/use-members';
import type { Member } from '@/types/member.types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  branchId:          z.string().min(1, 'Branch is required'),
  firstName:         z.string().min(1, 'First name is required').max(50),
  lastName:          z.string().min(1, 'Last name is required').max(50),
  email:             z.string().email('Invalid email'),
  phone:             z.string().min(5, 'Phone is required').max(30),
  dateOfBirth:       z.string().optional(),
  gender:            z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  notes:             z.string().max(1000).optional(),
  consentMarketing:  z.boolean().default(false),
  consentDataProcessing: z.boolean().default(false),
  // Emergency contact
  ec_name:           z.string().optional(),
  ec_relationship:   z.string().optional(),
  ec_phone:          z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member;
  defaultBranchId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberForm({ open, onOpenChange, member, defaultBranchId }: MemberFormProps) {
  const isEdit = !!member;

  const createMember = useCreateMember({ onSuccess: () => onOpenChange(false) });
  const updateMember = useUpdateMember(member?._id ?? '', { onSuccess: () => onOpenChange(false) });
  const isPending = createMember.isPending || updateMember.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: defaultBranchId ?? '',
      consentMarketing: false,
      consentDataProcessing: false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (member) {
      reset({
        branchId:              member.branchId,
        firstName:             member.firstName,
        lastName:              member.lastName,
        email:                 member.email,
        phone:                 member.phone,
        dateOfBirth:           member.dateOfBirth?.slice(0, 10),
        gender:                member.gender,
        notes:                 member.notes ?? '',
        consentMarketing:      member.consentMarketing,
        consentDataProcessing: member.consentDataProcessing,
        ec_name:               member.emergencyContact?.name ?? '',
        ec_relationship:       member.emergencyContact?.relationship ?? '',
        ec_phone:              member.emergencyContact?.phone ?? '',
      });
    } else {
      reset({ branchId: defaultBranchId ?? '', consentMarketing: false, consentDataProcessing: false });
    }
  }, [member, defaultBranchId, reset]);

  function onSubmit(values: FormValues) {
    const emergencyContact =
      values.ec_name
        ? { name: values.ec_name, relationship: values.ec_relationship ?? '', phone: values.ec_phone ?? '' }
        : undefined;

    if (isEdit) {
      updateMember.mutate({
        firstName:  values.firstName,
        lastName:   values.lastName,
        phone:      values.phone,
        dateOfBirth: values.dateOfBirth,
        gender:     values.gender,
        notes:      values.notes,
        consentMarketing: values.consentMarketing,
        emergencyContact,
      });
    } else {
      createMember.mutate({
        branchId:   values.branchId,
        firstName:  values.firstName,
        lastName:   values.lastName,
        email:      values.email,
        phone:      values.phone,
        dateOfBirth: values.dateOfBirth,
        gender:     values.gender,
        notes:      values.notes,
        consentMarketing:      values.consentMarketing,
        consentDataProcessing: values.consentDataProcessing,
        emergencyContact,
      });
    }
  }

  function field(
    label: string,
    name: keyof FormValues,
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>,
  ) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          disabled={isPending}
          className={errors[name] ? 'border-destructive' : ''}
          {...inputProps}
          {...register(name as Parameters<typeof register>[0])}
        />
        {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 z-10">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Member' : 'Register New Member'}</h2>
          <p className="text-sm text-muted-foreground">
            {isEdit ? 'Update member profile information.' : 'Fill in the details to register a new gym member.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

          {/* ── Personal info ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>

            <div className="grid grid-cols-2 gap-3">
              {field('First Name *', 'firstName', { placeholder: 'John' })}
              {field('Last Name *', 'lastName', { placeholder: 'Doe' })}
            </div>

            {!isEdit && field('Email *', 'email', { type: 'email', placeholder: 'john@example.com' })}
            {field('Phone *', 'phone', { type: 'tel', placeholder: '+1 555 0100' })}

            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="branchId">Branch *</Label>
                <Input
                  id="branchId"
                  placeholder="Branch ID"
                  disabled={isPending}
                  className={errors.branchId ? 'border-destructive' : ''}
                  {...register('branchId')}
                />
                {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" disabled={isPending} {...register('dateOfBirth')} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={watch('gender') ?? ''}
                  onValueChange={(v) => setValue('gender', v as FormValues['gender'])}
                >
                  <SelectTrigger disabled={isPending}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                placeholder="Staff notes (not visible to member)…"
                disabled={isPending}
                {...register('notes')}
              />
            </div>
          </section>

          <Separator />

          {/* ── Emergency contact ── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Emergency Contact</h3>
            {field('Name', 'ec_name', { placeholder: 'Jane Doe' })}
            <div className="grid grid-cols-2 gap-3">
              {field('Relationship', 'ec_relationship', { placeholder: 'Spouse' })}
              {field('Phone', 'ec_phone', { type: 'tel', placeholder: '+1 555 0200' })}
            </div>
          </section>

          <Separator />

          {/* ── Consents ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Consent</h3>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consentMarketing"
                checked={watch('consentMarketing')}
                onCheckedChange={(v) => setValue('consentMarketing', !!v)}
                disabled={isPending}
              />
              <label htmlFor="consentMarketing" className="text-sm leading-tight cursor-pointer">
                I consent to receive marketing communications
              </label>
            </div>
            {!isEdit && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consentDataProcessing"
                  checked={watch('consentDataProcessing')}
                  onCheckedChange={(v) => setValue('consentDataProcessing', !!v)}
                  disabled={isPending}
                />
                <label htmlFor="consentDataProcessing" className="text-sm leading-tight cursor-pointer">
                  I consent to data processing as per privacy policy <span className="text-destructive">*</span>
                </label>
              </div>
            )}
          </section>

          {/* ── Footer ── */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Register Member'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
