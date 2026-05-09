import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useCreateTrainer, useUpdateTrainer } from '../hooks/use-trainers';
import type { TrainerProfile, TrainerStatus } from '@/types/trainer.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'CAD', 'AUD'];

const SPECIALIZATION_SUGGESTIONS = [
  'weight loss', 'muscle building', 'cardio', 'yoga', 'pilates',
  'crossfit', 'rehabilitation', 'nutrition', 'senior fitness', 'sports performance',
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const availabilitySlotSchema = z.object({
  day: z.number().min(0).max(6),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
});

const trainerFormSchema = z.object({
  // create-only
  userId: z.string().min(1, 'User ID is required').optional(),

  branchIds: z.array(z.string()).min(1, 'At least one branch is required'),
  specializations: z.string().optional(),   // comma-separated input
  certifications: z.string().optional(),    // comma-separated input
  bio: z.string().optional(),
  experienceYears: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().int().min(0).max(60).optional()),
  maxClients: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().int().min(1).max(500).optional()),
  hourlyRate: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(0).optional()),
  currency: z.string().optional(),
  status: z.enum(['active', 'inactive', 'on_leave'] as const).optional(),
  availability: z.array(availabilitySlotSchema).optional(),
});

type TrainerFormValues = z.input<typeof trainerFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrainerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer?: TrainerProfile;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainerForm({ open, onOpenChange, trainer }: TrainerFormProps) {
  const isEdit = !!trainer;

  const { data: branchesData } = useGetBranches({ limit: 100 });
  const branches = branchesData?.data ?? [];

  const createTrainer = useCreateTrainer({ onSuccess: () => onOpenChange(false) });
  const updateTrainer = useUpdateTrainer(trainer?._id ?? '', { onSuccess: () => onOpenChange(false) });
  const isPending = createTrainer.isPending || updateTrainer.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<TrainerFormValues>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: {
      userId: '',
      branchIds: [],
      specializations: '',
      certifications: '',
      bio: '',
      experienceYears: '',
      maxClients: '',
      hourlyRate: '',
      currency: 'USD',
      status: 'active',
      availability: [],
    },
  });

  const { fields: availFields, append: appendSlot, remove: removeSlot } = useFieldArray({
    control,
    name: 'availability',
  });

  // Populate form when editing
  useEffect(() => {
    if (open && trainer) {
      reset({
        branchIds: trainer.branchIds ?? [],
        specializations: trainer.specializations?.join(', ') ?? '',
        certifications: trainer.certifications?.join(', ') ?? '',
        bio: trainer.bio ?? '',
        experienceYears: trainer.experienceYears !== undefined ? String(trainer.experienceYears) : '',
        maxClients: trainer.maxClients !== undefined ? String(trainer.maxClients) : '',
        hourlyRate: trainer.hourlyRate !== undefined ? String(trainer.hourlyRate) : '',
        currency: trainer.currency ?? 'USD',
        status: trainer.status ?? 'active',
        availability: trainer.availability ?? [],
      });
    } else if (open && !trainer) {
      reset({
        userId: '',
        branchIds: [],
        specializations: '',
        certifications: '',
        bio: '',
        experienceYears: '',
        maxClients: '',
        hourlyRate: '',
        currency: 'USD',
        status: 'active',
        availability: [],
      });
    }
  }, [open, trainer, reset]);

  function splitTags(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function onSubmit(values: TrainerFormValues) {
    const specializations = splitTags(values.specializations as string | undefined);
    const certifications = splitTags(values.certifications as string | undefined);

    if (isEdit) {
      updateTrainer.mutate({
        branchIds: values.branchIds,
        specializations,
        certifications,
        bio: values.bio || undefined,
        experienceYears: values.experienceYears as number | undefined,
        maxClients: values.maxClients as number | undefined,
        hourlyRate: values.hourlyRate as number | undefined,
        currency: values.currency || undefined,
        status: values.status as TrainerStatus | undefined,
        availability: values.availability,
      });
    } else {
      createTrainer.mutate({
        userId: values.userId!,
        branchIds: values.branchIds,
        specializations,
        certifications,
        bio: values.bio || undefined,
        experienceYears: values.experienceYears as number | undefined,
        maxClients: values.maxClients as number | undefined,
        hourlyRate: values.hourlyRate as number | undefined,
        currency: values.currency || undefined,
        availability: values.availability,
      });
    }
  }

  const watchedBranchIds = watch('branchIds') ?? [];

  function toggleBranch(id: string) {
    const current = watchedBranchIds;
    if (current.includes(id)) {
      setValue('branchIds', current.filter((b) => b !== id), { shouldValidate: true });
    } else {
      setValue('branchIds', [...current, id], { shouldValidate: true });
    }
  }

  function addAvailabilitySlot() {
    appendSlot({ day: 1, startTime: '09:00', endTime: '17:00' });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Trainer' : 'Add Trainer'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update trainer profile, specializations, and availability.'
              : 'Create a trainer profile for an existing user account.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">

          {/* User ID — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="userId">User ID <span className="text-destructive">*</span></Label>
              <Input id="userId" placeholder="MongoDB ObjectId of the user" {...register('userId')} />
              {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
              <p className="text-xs text-muted-foreground">The user must already have an account in the system.</p>
            </div>
          )}

          {/* Branches */}
          <div className="space-y-2">
            <Label>Branches <span className="text-destructive">*</span></Label>
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading branches…</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
                {branches.map((branch) => (
                  <label
                    key={branch._id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={watchedBranchIds.includes(branch._id ?? '')}
                      onCheckedChange={() => toggleBranch(branch._id ?? '')}
                    />
                    <span>{branch.name}</span>
                    {branch.isHeadquarters && (
                      <span className="text-xs text-muted-foreground">(HQ)</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {errors.branchIds && <p className="text-xs text-destructive">{errors.branchIds.message}</p>}
          </div>

          {/* Specializations */}
          <div className="space-y-1.5">
            <Label htmlFor="specializations">Specializations</Label>
            <Input
              id="specializations"
              placeholder="e.g. weight loss, yoga, crossfit"
              {...register('specializations')}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Suggestions: {SPECIALIZATION_SUGGESTIONS.slice(0, 4).join(', ')}…
            </p>
          </div>

          {/* Certifications */}
          <div className="space-y-1.5">
            <Label htmlFor="certifications">Certifications</Label>
            <Input
              id="certifications"
              placeholder="e.g. NASM-CPT, ACE, CrossFit L2"
              {...register('certifications')}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of certifications.</p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              placeholder="Brief professional background…"
              {...register('bio')}
            />
          </div>

          {/* Experience + Max Clients */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="experienceYears">Experience (years)</Label>
              <Input
                id="experienceYears"
                type="number"
                min={0}
                max={60}
                placeholder="5"
                {...register('experienceYears')}
              />
              {errors.experienceYears && (
                <p className="text-xs text-destructive">{errors.experienceYears.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxClients">Max Clients</Label>
              <Input
                id="maxClients"
                type="number"
                min={1}
                placeholder="20"
                {...register('maxClients')}
              />
              {errors.maxClients && (
                <p className="text-xs text-destructive">{errors.maxClients.message}</p>
              )}
            </div>
          </div>

          {/* Hourly Rate + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <Input
                id="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                placeholder="50.00"
                {...register('hourlyRate')}
              />
              {errors.hourlyRate && (
                <p className="text-xs text-destructive">{errors.hourlyRate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('currency') ?? 'USD'}
                onValueChange={(v) => setValue('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status — edit only */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={watch('status') ?? 'active'}
                onValueChange={(v) => setValue('status', v as TrainerStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Availability */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Availability</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAvailabilitySlot}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Slot
              </Button>
            </div>

            {availFields.length === 0 && (
              <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No availability slots. Add one above.
              </p>
            )}

            <div className="space-y-2">
              {availFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 rounded-md border p-3">
                  {/* Day */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Day</Label>
                    <Select
                      value={String(watch(`availability.${index}.day`) ?? 1)}
                      onValueChange={(v) =>
                        setValue(`availability.${index}.day`, Number(v), { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, i) => (
                          <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start */}
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      {...register(`availability.${index}.startTime`)}
                    />
                  </div>

                  {/* End */}
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      {...register(`availability.${index}.endTime`)}
                    />
                  </div>

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeSlot(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Trainer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
