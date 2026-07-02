import { format, formatDistanceToNow } from 'date-fns';
import { CURRENCY } from '@/config/tenant.config';

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy');
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy HH:mm');
};

export const formatRelative = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true });
};

export const formatCurrency = (amount: number, currency = 'PKR') =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency }).format(amount);

export const formatPercent = (value: number) =>
  `${(value * 100).toFixed(1)}%`;

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Formats a Date to 'yyyy-MM-dd' for use as an API query parameter. */
export const formatApiDate = (d: Date): string => format(d, 'yyyy-MM-dd');

// ─── Compact currency formatters ──────────────────────────────────────────────

/**
 * Compact currency display for stat cards and chart axes.
 * e.g. 1,200,000 → "PKR 1.2M", 45000 → "PKR 45.0K"
 */
export const formatCurrencyCompact = (value: number, currency = CURRENCY): string => {
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${currency} ${(value / 1_000).toFixed(1)}K`;
  return `${currency} ${Math.round(value).toLocaleString()}`;
};

/**
 * Full currency display for tooltips and detail views.
 * e.g. 45000 → "PKR 45,000"
 */
export const formatCurrencyFull = (value: number, currency = CURRENCY): string =>
  `${currency} ${Math.round(value).toLocaleString()}`;
