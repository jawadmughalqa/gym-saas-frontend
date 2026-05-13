/**
 * tenant.config.ts
 *
 * Single source of truth for tenant-specific defaults.
 * All currency, locale, timezone, country, and phone settings live here.
 * Import from this file instead of hardcoding values anywhere in the project.
 *
 * To support a different country/currency in the future, update only this file.
 */

// ─── Currency ─────────────────────────────────────────────────────────────────

export const CURRENCY = 'PKR' as const;
export const CURRENCY_SYMBOL = '₨' as const;

/** Single-entry array used in dropdowns that list supported currencies. */
export const CURRENCIES = [
  { value: CURRENCY, label: `${CURRENCY} – Pakistani Rupee` },
] as const;

// ─── Locale & timezone ────────────────────────────────────────────────────────

/** BCP-47 locale tag for number / date formatting. */
export const LOCALE = 'en-PK' as const;

export const TIMEZONE = 'Asia/Karachi' as const;

/** Timezone options for select inputs. */
export const TIMEZONE_OPTIONS = [
  { value: TIMEZONE, label: 'Asia/Karachi (PKT, UTC+5)' },
] as const;

// ─── Country ──────────────────────────────────────────────────────────────────

export const COUNTRY = 'Pakistan' as const;

/** Country options for select inputs. */
export const COUNTRY_OPTIONS = [
  { value: COUNTRY, label: COUNTRY },
] as const;

// ─── Phone ────────────────────────────────────────────────────────────────────

export const PHONE = {
  /** ITU country calling code (without leading +). */
  countryCode: '+92',

  /** Placeholder shown in phone input fields. */
  placeholder: '+92 3XX-XXXXXXX',

  /**
   * Accepts the common Pakistani mobile formats:
   *  - 03XX-XXXXXXX   (local)
   *  - +923XX-XXXXXXX (international)
   *  - 923XXXXXXXXXX  (no plus)
   * Spaces and hyphens are tolerated.
   */
  regex: /^(?:\+92|0092|92|0)?[3][0-9]{9}$/,

  errorMessage: 'Enter a valid Pakistani mobile number (e.g. 03XX-XXXXXXX)',
} as const;

// ─── Convenience re-export ────────────────────────────────────────────────────

/** Shorthand object — useful when you need multiple values at once. */
export const TENANT_CONFIG = {
  currency: CURRENCY,
  currencySymbol: CURRENCY_SYMBOL,
  currencies: CURRENCIES,
  locale: LOCALE,
  timezone: TIMEZONE,
  timezoneOptions: TIMEZONE_OPTIONS,
  country: COUNTRY,
  countryOptions: COUNTRY_OPTIONS,
  phone: PHONE,
} as const;

export default TENANT_CONFIG;
