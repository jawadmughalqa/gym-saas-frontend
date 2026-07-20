/**
 * PhoneInput
 *
 * A controlled phone input with an emoji-flag country selector.
 *
 * Architecture:
 *   • The flag button shows the country + calling code (e.g. 🇺🇸 +1).
 *   • The text field shows ONLY the national portion, auto-formatted
 *     by AsYouType as the user types digits (e.g. "(212) 454-0148").
 *   • onChange emits calling-code + national: "+1 (212) 454-0148".
 *     The backend normalisePhone() converts any format to E.164.
 *   • Accepts any stored format as `value` (E.164, national, formatted).
 *
 * Props:
 *   value          — current field value (any phone format)
 *   onChange       — called with "+callingCode nationalFormatted" on every keystroke
 *   defaultCountry — ISO 3166-1 alpha-2 seed (e.g. 'US', 'GB').
 *                    Use useTenantPhoneCountry().countryCode to derive from tenant.
 *   placeholder    — fallback; overridden by the country's phoneExample
 *   id / disabled / className — forwarded to the inner Input
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { AsYouType, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WORLD_COUNTRIES, type WorldCountry } from '@/config/world-countries';

// ─── Country flag emoji helper ────────────────────────────────────────────────

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract digits-only from a calling code string, e.g. "+1" → "1", "+44" → "44" */
function ccDigits(callingCode: string): string {
  return callingCode.replace(/\D/g, '');
}

/**
 * Given a full phone value (any format) and the selected country,
 * return the national-only digits string.
 */
function extractNationalDigits(value: string, country: WorldCountry): string {
  const all = value.replace(/\D/g, '');
  const cc  = ccDigits(country.callingCode);
  return all.startsWith(cc) ? all.slice(cc.length) : all;
}

/**
 * Format national-only digits for the given country using AsYouType.
 * e.g. "2124540148" + 'US' → "(212) 454-0148"
 */
function formatNational(digits: string, countryCode: string): string {
  if (!digits) return '';
  const formatter = new AsYouType(countryCode as CountryCode);
  return formatter.input(digits);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value:                  string;
  onChange:               (value: string) => void;
  defaultCountry?:        string;
  /** @deprecated Use defaultCountry instead */
  countryCode?:           string;
  placeholder?:           string;
  disabled?:              boolean;
  /** Lock the flag/country selector so the user cannot change the calling code */
  disableCountrySelect?:  boolean;
  className?:             string;
  id?:                    string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhoneInput({
  value,
  onChange,
  defaultCountry,
  countryCode: countryCodeLegacy,
  placeholder,
  disabled,
  disableCountrySelect = false,
  className,
  id,
}: PhoneInputProps) {

  const seedCode = defaultCountry ?? countryCodeLegacy ?? 'US';

  const findCountry = (code: string): WorldCountry =>
    WORLD_COUNTRIES.find((c) => c.code === code) ??
    WORLD_COUNTRIES.find((c) => c.code === 'US') ??
    WORLD_COUNTRIES[0]!;

  const [selected, setSelected] = useState<WorldCountry>(() => findCountry(seedCode));
  const [open, setOpen]         = useState(false);
  const prevSeedRef             = useRef(seedCode);

  // Sync when defaultCountry changes (e.g. tenant data loads after mount)
  useEffect(() => {
    if (seedCode !== prevSeedRef.current) {
      prevSeedRef.current = seedCode;
      setSelected(findCountry(seedCode));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedCode]);

  // ── National display value ─────────────────────────────────────────────────
  // Strip the calling-code prefix and show only the formatted national portion.
  // Works with any incoming format: E.164, "+1 (212)…", "(212)…", etc.
  const nationalDisplay = useMemo(() => {
    const digits = extractNationalDigits(value, selected);
    return formatNational(digits, selected.code);
  }, [value, selected]);

  // Placeholder: strip calling code from phoneExample so it matches display
  const nationalExample = placeholder
    ?? selected.phoneExample.replace(/^\+\d+\s*/, '');

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleCountrySelect(country: WorldCountry) {
    setSelected(country);
    setOpen(false);
    if (value) {
      // Re-map existing digits to the new country
      const nationalDigits = extractNationalDigits(value, selected);
      const national = formatNational(nationalDigits, country.code);
      if (national) onChange(`${country.callingCode} ${national}`);
    }
  }

  function handleChange(raw: string) {
    // Digits only from what the user typed in the national field
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      onChange('');
      return;
    }
    const national = formatNational(digits, selected.code);
    onChange(`${selected.callingCode} ${national}`);
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid = !!value && (() => {
    try {
      return isValidPhoneNumber(value, selected.code as CountryCode);
    } catch {
      return false;
    }
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-1">

      {/* ── Country selector ── */}
      {disableCountrySelect ? (
        /* Locked: show flag + calling code as a static badge */
        <div className="flex h-9 w-[5.5rem] shrink-0 items-center justify-center gap-1 rounded-md border border-input bg-muted px-2">
          <span className="text-base leading-none">{countryFlag(selected.code)}</span>
          <span className="text-xs text-muted-foreground">{selected.callingCode}</span>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="h-9 w-[5.5rem] shrink-0 justify-between gap-1 px-2 font-normal"
            >
              <span className="text-base leading-none">{countryFlag(selected.code)}</span>
              <span className="text-xs text-muted-foreground">{selected.callingCode}</span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country…" />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {WORLD_COUNTRIES.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.name} ${c.callingCode} ${c.code}`}
                      onSelect={() => handleCountrySelect(c)}
                      className="gap-2 text-sm"
                    >
                      <span className="text-base">{countryFlag(c.code)}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.callingCode}</span>
                      {selected.code === c.code && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* ── Phone number input (national portion only) ── */}
      <div className="relative flex-1">
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={nationalDisplay}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={nationalExample}
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

    </div>
  );
}
