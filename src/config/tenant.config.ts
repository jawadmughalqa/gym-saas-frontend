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

export const CURRENCY = 'USD' as const;
export const CURRENCY_SYMBOL = '$' as const;

/** Single-entry array used in dropdowns that list supported currencies. */
export const CURRENCIES = [
  { value: CURRENCY, label: `${CURRENCY} – US Dollar` },
] as const;

// ─── Locale & timezone ────────────────────────────────────────────────────────

/** BCP-47 locale tag for number / date formatting. */
export const LOCALE = 'en-US' as const;

export const TIMEZONE = 'UTC' as const;

/** Timezone options for select inputs. */
export const TIMEZONE_OPTIONS = [
  { value: 'UTC',              label: 'UTC (Coordinated Universal Time)'  },
  { value: 'America/New_York', label: 'America/New_York (ET, UTC-5/-4)'   },
  { value: 'America/Chicago',  label: 'America/Chicago (CT, UTC-6/-5)'    },
  { value: 'America/Denver',   label: 'America/Denver (MT, UTC-7/-6)'     },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PT, UTC-8/-7)' },
  { value: 'America/Toronto',  label: 'America/Toronto (ET, UTC-5/-4)'    },
  { value: 'America/Vancouver', label: 'America/Vancouver (PT, UTC-8/-7)' },
  { value: 'Europe/London',    label: 'Europe/London (GMT/BST, UTC+0/+1)' },
  { value: 'Europe/Paris',     label: 'Europe/Paris (CET, UTC+1/+2)'      },
  { value: 'Asia/Dubai',       label: 'Asia/Dubai (GST, UTC+4)'           },
  { value: 'Asia/Karachi',     label: 'Asia/Karachi (PKT, UTC+5)'         },
  { value: 'Asia/Kolkata',     label: 'Asia/Kolkata (IST, UTC+5:30)'      },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10/+11)' },
] as const;

// ─── Country ──────────────────────────────────────────────────────────────────

export const COUNTRY = 'United States' as const;

/** Country options for select inputs. */
export const COUNTRY_OPTIONS = [
  { value: COUNTRY, label: COUNTRY },
] as const;

// ─── Phone ────────────────────────────────────────────────────────────────────

export const PHONE = {
  /** ITU country calling code (without leading +). */
  countryCode: '+1',

  /** Placeholder shown in phone input fields. */
  placeholder: '+1 (212) 555-0147',

  /**
   * Accepts international E.164 format and common local formats.
   * Phone validation is handled per-country via WORLD_COUNTRIES patterns.
   */
  regex: /^\+?[1-9]\d{6,14}$/,

  errorMessage: 'Enter a valid phone number in international format (e.g. +1 212 555 0147)',
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
