import { Checkbox } from '@/components/ui/checkbox';
import type { UseFormWatch, UseFormSetValue } from 'react-hook-form';
import type { MemberFormValues } from './types';

interface Props {
  watch:     UseFormWatch<MemberFormValues>;
  setValue:  UseFormSetValue<MemberFormValues>;
  isEdit:    boolean;
  isPending: boolean;
}

export function ConsentSection({ watch, setValue, isEdit, isPending }: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Consent
      </h3>

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

      {/* Data processing consent — create only (cannot un-consent after registration) */}
      {!isEdit && (
        <div className="flex items-start gap-3">
          <Checkbox
            id="consentDataProcessing"
            checked={watch('consentDataProcessing')}
            onCheckedChange={(v) => setValue('consentDataProcessing', !!v)}
            disabled={isPending}
          />
          <label htmlFor="consentDataProcessing" className="text-sm leading-tight cursor-pointer">
            I consent to data processing as per privacy policy{' '}
            <span className="text-destructive">*</span>
          </label>
        </div>
      )}
    </section>
  );
}