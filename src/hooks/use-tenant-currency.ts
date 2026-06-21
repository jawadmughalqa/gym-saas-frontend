/**
 * useTenantCurrency
 *
 * Returns the currency code, symbol, and country for the current tenant.
 * Works for ALL authenticated roles (gym_owner, branch_manager, trainer,
 * staff, member) because /tenants/me only requires authenticate middleware.
 *
 * The currency symbol is derived from WORLD_COUNTRIES so it matches the
 * super-admin's configured list exactly.
 */

import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import { WORLD_COUNTRIES } from '@/config/world-countries';

export interface TenantCurrency {
  /** ISO 4217 currency code, e.g. 'USD', 'GBP', 'PKR' */
  currency: string;
  /** Display symbol, e.g. '$', '£', '₨' */
  currencySymbol: string;
  /** Country name set by the super admin at tenant creation */
  country: string;
}

const FALLBACK: TenantCurrency = {
  currency: 'USD',
  currencySymbol: '$',
  country: '',
};

export function useTenantCurrency(): TenantCurrency {
  const { data } = useGetMyTenant({ query: { staleTime: 10 * 60 * 1000 } });
  const tenant = data?.data;

  const currency = tenant?.settings?.currency;
  const country  = tenant?.country ?? '';

  if (!currency) return { ...FALLBACK, country };

  // Derive the symbol from the static WORLD_COUNTRIES list
  const countryData = WORLD_COUNTRIES.find((c) => c.currencyCode === currency);
  const currencySymbol = countryData?.currencySymbol ?? currency;

  return { currency, currencySymbol, country };
}
