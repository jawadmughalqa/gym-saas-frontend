import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { PHONE } from '@/config/tenant.config';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import type { MemberFormValues } from './types';

interface Props {
  register:   UseFormRegister<MemberFormValues>;
  watch:      UseFormWatch<MemberFormValues>;
  setValue:   UseFormSetValue<MemberFormValues>;
  errors:     FieldErrors<MemberFormValues>;
  isEdit:     boolean;
  isPending:  boolean;
  branches:   { _id: string; name: string }[];
  branchesLoading: boolean;
}

export function PersonalInfoSection({
  register,
  watch,
  setValue,
  errors,
  isEdit,
  isPending,
  branches,
  branchesLoading,
}: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Personal Information
      </h3>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            disabled={isPending}
            className={errors.firstName ? 'border-destructive' : ''}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            disabled={isPending}
            className={errors.lastName ? 'border-destructive' : ''}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email — create only */}
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            disabled={isPending}
            className={errors.email ? 'border-destructive' : ''}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      )}

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder={PHONE.placeholder}
          disabled={isPending}
          className={errors.phone ? 'border-destructive' : ''}
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Branch — available in both create and edit */}
      <div className="space-y-1.5">
        <Label htmlFor="branchId">Branch *</Label>
        <Select
          value={watch('branchId')}
          onValueChange={(v) => setValue('branchId', v, { shouldValidate: true })}
          disabled={isPending || branchesLoading}
        >
          <SelectTrigger
            id="branchId"
            className={errors.branchId ? 'border-destructive' : ''}
          >
            <SelectValue
              placeholder={branchesLoading ? 'Loading branches…' : 'Select a branch'}
            />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b._id} value={b._id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branchId && (
          <p className="text-xs text-destructive">{errors.branchId.message}</p>
        )}
      </div>

      {/* Age + Gender */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={1}
            max={120}
            placeholder="e.g. 28"
            disabled={isPending}
            {...register('age', { valueAsNumber: true })}
          />
          {errors.age && (
            <p className="text-xs text-destructive">{errors.age.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select
            value={watch('gender') ?? ''}
            onValueChange={(v) => setValue('gender', v as MemberFormValues['gender'])}
            disabled={isPending}
          >
            <SelectTrigger>
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

      {/* Notes */}
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
  );
}