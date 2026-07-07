/**
 * useFormatters
 *
 * Returns currency and date formatters pre-bound to the tenant's locale and
 * currency so every component automatically uses the right separators, symbols,
 * and month names without passing locale/currency at every call site.
 *
 * Usage:
 *   const { fmt } = useFormatters();
 *   fmt.currency(1234.56)        → "$1,234.56" / "€1.234,56" / "£1,234.56"
 *   fmt.currencyCompact(45000)   → "$45.0K"
 *   fmt.currencyFull(45000)      → "$45,000"
 *   fmt.date('2026-07-07')       → "Jul 7, 2026" / "7 juil. 2026" / "7. Juli 2026"
 *   fmt.dateTime('2026-07-07T14:30:00Z') → "Jul 7, 2026, 2:30 PM"
 */

import { useTenantCurrency } from './use-tenant-currency';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyFull,
  formatDate,
  formatDateTime,
} from '@/utils/format';

export interface Formatters {
  currency:        (amount: number) => string;
  currencyCompact: (amount: number) => string;
  currencyFull:    (amount: number) => string;
  date:            (date: string | Date | null | undefined) => string;
  dateTime:        (date: string | Date | null | undefined) => string;
}

export function useFormatters(): { fmt: Formatters; currency: string; locale: string } {
  const { currency, locale } = useTenantCurrency();

  const fmt: Formatters = {
    currency:        (amount) => formatCurrency(amount, currency, locale),
    currencyCompact: (amount) => formatCurrencyCompact(amount, currency, locale),
    currencyFull:    (amount) => formatCurrencyFull(amount, currency, locale),
    date:            (date)   => formatDate(date, locale),
    dateTime:        (date)   => formatDateTime(date, locale),
  };

  return { fmt, currency, locale };
}
