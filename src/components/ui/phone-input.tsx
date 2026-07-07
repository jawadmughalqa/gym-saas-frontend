/**
 * PhoneInput
 *
 * A controlled phone input that formats digits as the user types using
 * libphonenumber-js AsYouType, keyed to the tenant's country code.
 *
 * Props:
 *   value       — current field value (formatted string)
 *   onChange    — called with the new formatted string on every keystroke
 *   countryCode — ISO 3166-1 alpha-2 code (e.g. 'CA', 'GB', 'AE')
 *                 derived from WORLD_COUNTRIES.find(c => c.name === tenantCountry)?.code
 *   placeholder — shown when empty; use countryData.phoneExample
 *   id / disabled / className — passed straight to the inner Input
 *
 * Behaviour:
 *   • Formats as the user types (spaces, dashes, parens per country rules).
 *   • Shows a green ✓ badge when isValidPhoneNumber() returns true.
 *   • If countryCode is undefined/empty, acts as a plain tel input (no masking).
 *   • Supports E.164 input (+1…) — AsYouType auto-detects the country from the
 *     calling code, so international numbers typed with + always work.
 */

import { AsYouType, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value:        string;
  onChange:     (value: string) => void;
  countryCode?: string;   // ISO 3166-1 alpha-2, e.g. 'CA', 'GB'
  placeholder?: string;
  disabled?:    boolean;
  className?:   string;
  id?:          string;
}

export function PhoneInput({
  value,
  onChange,
  countryCode,
  placeholder,
  disabled,
  className,
  id,
}: PhoneInputProps) {

  function handleChange(raw: string) {
    if (!countryCode) {
      onChange(raw);
      return;
    }
    // AsYouType formats as digits arrive; passing the country hint means
    // national numbers (without +) are also formatted correctly.
    const formatter = new AsYouType(countryCode as CountryCode);
    const formatted = formatter.input(raw);
    onChange(formatted);
  }

  // Validate only when we have both a value and a country hint
  const isValid = !!countryCode && !!value
    ? (() => {
        try {
          return isValidPhoneNumber(value, countryCode as CountryCode);
        } catch {
          return false;
        }
      })()
    : false;

  return (
    <div className="relative">
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(isValid ? 'pr-8' : '', className)}
      />
      {isValid && (
        <span
          aria-label="Valid phone number"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 text-sm font-semibold select-none"
        >
          ✓
        </span>
      )}
    </div>
  );
}
