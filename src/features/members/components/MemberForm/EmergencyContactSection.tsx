import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import type { MemberFormValues } from './types';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { WORLD_COUNTRIES } from '@/config/world-countries';

interface Props {
  register:  UseFormRegister<MemberFormValues>;
  watch:     UseFormWatch<MemberFormValues>;
  setValue:  UseFormSetValue<MemberFormValues>;
  errors:    FieldErrors<MemberFormValues>;
  isPending: boolean;
}

export function EmergencyContactSection({ register, watch, setValue, errors, isPending }: Props) {
  const { country: tenantCountry } = useTenantCurrency();
  const countryData = WORLD_COUNTRIES.find((c) => c.name === tenantCountry);
  const phonePlaceholder = countryData?.phoneExample ?? '+1 (212) 555-0147';
  const phoneIsoCode = countryData?.code;

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
          <PhoneInput
            id="ec_phone"
            value={watch('ec_phone') ?? ''}
            onChange={(v) => setValue('ec_phone', v, { shouldValidate: true })}
            countryCode={phoneIsoCode}
            placeholder={phonePlaceholder}
            disabled={isPending}
          />
        </div>
      </div>
    </section>
  );
}
