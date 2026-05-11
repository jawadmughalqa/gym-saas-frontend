import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, ChevronsUpDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useGetBranches } from '@/api/generated/branches/branches';
import { useCreateTrainer, useUpdateTrainer } from '../hooks/use-trainers';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/utils/error';
import { api } from '@/lib/axios';
import type { TrainerProfile, TrainerStatus } from '@/types/trainer.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// PKR first — this is a Pakistani gym product
const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'EUR', 'GBP'];

const SPECIALIZATION_SUGGESTIONS = [
  'weight loss', 'muscle building', 'cardio', 'yoga', 'pilates',
  'crossfit', 'rehabilitation', 'nutrition', 'senior fitness', 'sports performance',
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const availabilitySlotSchema = z.object({
  day:       z.number().min(0).max(6),
  startTime: z.string().min(1, 'Required'),
  endTime:   z.string().min(1, 'Required'),
});

const profileFieldsSchema = z.object({
  branchIds:       z.array(z.string()).min(1, 'At least one branch is required'),
  specializations: z.string().optional(),
  certifications:  z.string().optional(),
  bio:             z.string().optional(),
  experienceYears: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().int().min(0).max(60).optional()),
  maxClients: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().int().min(1).max(500).optional()),
  // monthlyRate replaces hourlyRate — Pakistani gyms pay trainers monthly
  monthlyRate: z.string().optional().transform((v) =>
    v === '' || v === undefined ? undefined : Number(v),
  ).pipe(z.number().min(0).optional()),
  currency:     z.string().optional(),
  status:       z.enum(['active', 'inactive', 'on_leave'] as const).optional(),
  availability: z.array(availabilitySlotSchema).optional(),
});

const createTrainerSchema = profileFieldsSchema.extend({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName:  z.string().min(1, 'Last name is required').max(80),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});

const editTrainerSchema = profileFieldsSchema;

type CreateTrainerFormValues = z.input<typeof createTrainerSchema>;
type EditTrainerFormValues   = z.input<typeof editTrainerSchema>;
type TrainerFormValues = CreateTrainerFormValues & EditTrainerFormValues;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrainerFormProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  trainer?:     TrainerProfile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

// ─── Branch Multi-Select Dropdown ─────────────────────────────────────────────

interface BranchMultiSelectProps {
  branches: Array<{ _id?: string; name?: string; isHeadquarters?: boolean }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  error?:   string;
  disabled?: boolean;
}

function BranchMultiSelect({
  branches,
  selected,
  onChange,
  error,
  disabled,
}: BranchMultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function remove(id: string) {
    onChange(selected.filter((s) => s !== id));
  }

  const selectedBranches = branches.filter((b) => selected.includes(b._id ?? ''));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              error && 'border-destructive',
              selected.length === 0 && 'text-muted-foreground',
            )}
          >
            {selected.length === 0
              ? 'Select branches…'
              : `${selected.length} branch${selected.length > 1 ? 'es' : ''} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search branches…" />
            <CommandList>
              <CommandEmpty>No branches found.</CommandEmpty>
              <CommandGroup>
                {branches.map((branch) => {
                  const id         = branch._id ?? '';
                  const isSelected = selected.includes(id);
                  return (
                    <CommandItem
                      key={id}
                      value={branch.name ?? id}
                      onSelect={() => toggle(id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span>{branch.name}</span>
                      {branch.isHeadquarters && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(HQ)</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected branch tags */}
      {selectedBranches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedBranches.map((branch) => (
            <Badge
              key={branch._id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs">{branch.name}</span>
              <button
                type="button"
                onClick={() => remove(branch._id ?? '')}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {branch.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainerForm({ open, onOpenChange, trainer }: TrainerFormProps) {
  const isEdit = !!trainer;

  const { data: branchesData, isLoading: branchesLoading } = useGetBranches({
    limit: 100,
    status: 'active',
  });
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
    formState: { errors, isSubmitting },
  } = useForm<TrainerFormValues>({
    resolver: zodResolver(isEdit ? editTrainerSchema : createTrainerSchema),
    defaultValues: {
      firstName:       '',
      lastName:        '',
      email:           '',
      password:        '',
      branchIds:       [],
      specializations: '',
      certifications:  '',
      bio:             '',
      experienceYears: '',
      maxClients:      '',
      monthlyRate:     '',
      currency:        'PKR',   // ← default PKR
      status:          'active',
      availability:    [],
    },
  });

  const { fields: availFields, append: appendSlot, remove: removeSlot } = useFieldArray({
    control,
    name: 'availability',
  });

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (open && trainer) {
      reset({
        branchIds:       trainer.branchIds ?? [],
        specializations: trainer.specializations?.join(', ') ?? '',
        certifications:  trainer.certifications?.join(', ')  ?? '',
        bio:             trainer.bio ?? '',
        experienceYears: trainer.experienceYears !== undefined
          ? String(trainer.experienceYears) : '',
        maxClients: trainer.maxClients !== undefined
          ? String(trainer.maxClients) : '',
        monthlyRate: (trainer as any).monthlyRate !== undefined
          ? String((trainer as any).monthlyRate) : '',
        currency:     trainer.currency ?? 'PKR',
        status:       trainer.status   ?? 'active',
        availability: trainer.availability ?? [],
      });
    } else if (open && !trainer) {
      reset({
        firstName:       '',
        lastName:        '',
        email:           '',
        password:        '',
        branchIds:       [],
        specializations: '',
        certifications:  '',
        bio:             '',
        experienceYears: '',
        maxClients:      '',
        monthlyRate:     '',
        currency:        'PKR',
        status:          'active',
        availability:    [],
      });
    }
  }, [open, trainer, reset]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: TrainerFormValues) {
    const specializations = splitTags(values.specializations as string | undefined);
    const certifications  = splitTags(values.certifications  as string | undefined);

    if (isEdit) {
      updateTrainer.mutate({
        branchIds:       values.branchIds,
        specializations,
        certifications,
        bio:             values.bio            || undefined,
        experienceYears: values.experienceYears as number | undefined,
        maxClients:      values.maxClients      as number | undefined,
        hourlyRate:      values.monthlyRate     as number | undefined, // field name on API is still hourlyRate
        currency:        values.currency        || undefined,
        status:          values.status          as TrainerStatus | undefined,
        availability:    values.availability,
      });
    } else {
      // Step 1 — create User account with role: trainer
      let userId: string;
      try {
        const { data: staffResponse } = await api.post('/staff', {
          firstName: values.firstName,
          lastName:  values.lastName,
          email:     values.email,
          password:  values.password,
          role:      'trainer',
          branchIds: values.branchIds,
        });
        userId = staffResponse.data.userId;
      } catch (err) {
        toast({
          variant:     'destructive',
          title:       'Failed to create trainer account',
          description: getErrorMessage(err),
        });
        return;
      }

      // Step 2 — create TrainerProfile linked to the new User
      createTrainer.mutate({
        userId,
        branchIds:       values.branchIds,
        specializations,
        certifications,
        bio:             values.bio            || undefined,
        experienceYears: values.experienceYears as number | undefined,
        maxClients:      values.maxClients      as number | undefined,
        hourlyRate:      values.monthlyRate     as number | undefined, // field name on API is still hourlyRate
        currency:        values.currency        || undefined,
        availability:    values.availability,
      });
    }
  }

  const watchedBranchIds = watch('branchIds') ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Trainer' : 'Add Trainer'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update trainer profile, specializations, and availability.'
              : 'Create a login account and trainer profile for a new trainer.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">

          {/* ── Account details (create only) ──────────────────────────── */}
          {!isEdit && (
            <div className="space-y-4 rounded-md border p-4 bg-muted/30">
              <p className="text-sm font-semibold">Login Account</p>
              <p className="text-xs text-muted-foreground">
                The trainer will use these credentials to log in. They will be required
                to change their password on first login.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="firstName" placeholder="Ahmed" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="lastName" placeholder="Khan" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="trainer@yourgym.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Temporary Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Branches ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>
              Branches <span className="text-destructive">*</span>
            </Label>
            {branchesLoading ? (
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            ) : (
              <BranchMultiSelect
                branches={branches}
                selected={watchedBranchIds}
                onChange={(ids) => setValue('branchIds', ids, { shouldValidate: true })}
                error={errors.branchIds?.message}
                disabled={isPending}
              />
            )}
          </div>

          {/* ── Specializations ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="specializations">Specializations</Label>
            <Input
              id="specializations"
              placeholder="e.g. weight loss, yoga, crossfit"
              {...register('specializations')}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Suggestions:{' '}
              {SPECIALIZATION_SUGGESTIONS.slice(0, 4).join(', ')}…
            </p>
          </div>

          {/* ── Certifications ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="certifications">Certifications</Label>
            <Input
              id="certifications"
              placeholder="e.g. NASM-CPT, ACE, CrossFit L2"
              {...register('certifications')}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of certifications.
            </p>
          </div>

          {/* ── Bio ─────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              placeholder="Brief professional background…"
              {...register('bio')}
            />
          </div>

          {/* ── Experience + Max Clients ────────────────────────────────── */}
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
                <p className="text-xs text-destructive">
                  {errors.experienceYears.message}
                </p>
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

          {/* ── Monthly Rate + Currency ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthlyRate">Monthly Rate</Label>
              <Input
                id="monthlyRate"
                type="number"
                min={0}
                step="1"
                placeholder="e.g. 35000"
                {...register('monthlyRate')}
              />
              {errors.monthlyRate && (
                <p className="text-xs text-destructive">{errors.monthlyRate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={watch('currency') ?? 'PKR'}
                onValueChange={(v) => setValue('currency', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="PKR" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Status (edit only) ──────────────────────────────────────── */}
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

          {/* ── Availability ────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Availability</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSlot({ day: 1, startTime: '09:00', endTime: '17:00' })}
              >
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
                <div
                  key={field.id}
                  className="flex items-end gap-2 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Day</Label>
                    <Select
                      value={String(watch(`availability.${index}.day`) ?? 1)}
                      onValueChange={(v) =>
                        setValue(`availability.${index}.day`, Number(v), {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((name, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      {...register(`availability.${index}.startTime`)}
                    />
                  </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      {...register(`availability.${index}.endTime`)}
                    />
                  </div>

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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              {isPending || isSubmitting
                ? 'Saving…'
                : isEdit ? 'Save Changes' : 'Create Trainer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}