import { formatDistanceToNow, format } from 'date-fns';

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date as "Jul 7, 2026" in the tenant's locale.
 * Pass locale from useTenantCurrency().locale for locale-aware month names.
 * Falls back to the browser locale when locale is undefined.
 */
export const formatDate = (
  date: string | Date | null | undefined,
  locale?: string,
): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

/**
 * Format a date+time as "Jul 7, 2026, 14:30" in the tenant's locale.
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  locale?: string,
): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelative = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true });
};

/** Formats a Date to 'yyyy-MM-dd' for use as an API query parameter. */
export const formatApiDate = (d: Date): string => format(d, 'yyyy-MM-dd');

// ─── Currency formatting ──────────────────────────────────────────────────────

/**
 * Full currency display, e.g. "$1,234.56", "£1,234.56", "€1.234,56".
 * Locale controls digit grouping and decimal separators automatically.
 * Pass locale from useTenantCurrency().locale for correct regional formatting.
 */
export const formatCurrency = (
  amount: number,
  currency = 'USD',
  locale?: string,
): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

/**
 * Compact currency display for stat cards and chart axes.
 * e.g. 1,200,000 → "CA$1.2M", 45000 → "£45.0K", 800 → "€800"
 * Uses Intl so symbol position and format follow the locale.
 */
export const formatCurrencyCompact = (
  value: number,
  currency = 'USD',
  locale?: string,
): string => {
  if (value >= 1_000_000) {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 1,
    }).format(value / 1_000_000);
    return `${formatted}M`;
  }
  if (value >= 1_000) {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 1,
    }).format(value / 1_000);
    return `${formatted}K`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

/**
 * Full currency display for tooltips and detail views (no cents).
 * e.g. 45000 → "$45,000", "€45.000", "£45,000"
 */
export const formatCurrencyFull = (
  value: number,
  currency = 'USD',
  locale?: string,
): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1)}%`;
