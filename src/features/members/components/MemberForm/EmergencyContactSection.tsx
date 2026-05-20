import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PHONE } from '@/config/tenant.config';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { MemberFormValues } from './types';

interface Props {
  register:  UseFormRegister<MemberFormValues>;
  errors:    FieldErrors<MemberFormValues>;
  isPending: boolean;
}

export function EmergencyContactSection({ register, errors, isPending }: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Emergency Contact
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="ec_name">Name</Label>
        <Input
          id="ec_name"
          placeholder="Jane Doe"
          disabled={isPending}
          {...register('ec_name')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ec_relationship">Relationship</Label>
          <Input
            id="ec_relationship"
            placeholder="Spouse"
            disabled={isPending}
            {...register('ec_relationship')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ec_phone">Phone</Label>
          <Input
            id="ec_phone"
            type="tel"
            placeholder={PHONE.placeholder}
            disabled={isPending}
            {...register('ec_phone')}
          />
        </div>
      </div>
    </section>
  );
}