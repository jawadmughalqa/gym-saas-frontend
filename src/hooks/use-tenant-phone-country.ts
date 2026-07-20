/**
 * useTenantPhoneCountry
 *
 * Returns the ISO 3166-1 alpha-2 country code and phone metadata for the
 * current tenant's country. Feed the result into PhoneInput's `defaultCountry`
 * prop to pre-select the correct dial code + flag without any extra prop-drilling.
 *
 * Derived from the same tenant.country string that useTenantCurrency uses,
 * so both hooks stay in sync automatically.
 */

import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import { WORLD_COUNTRIES, type WorldCountry } from '@/config/world-countries';

export interface TenantPhoneCountry {
  /** ISO 3166-1 alpha-2, e.g. 'US', 'GB', 'PK' — pass to PhoneInput defaultCountry */
  countryCode: string;
  /** Calling code string with + prefix, e.g. '+1', '+44', '+92' */
  callingCode: string;
  /** Example number for placeholder text, e.g. '+1 (212) 555-0147' */
  phoneExample: string;
  /** Full WorldCountry entry — use for anything else you need */
  country: WorldCountry | null;
}

const FALLBACK: TenantPhoneCountry = {
  countryCode:  'US',
  callingCode:  '+1',
  phoneExample: '+1 (555) 123 4567',
  country:      null,
};

export function useTenantPhoneCountry(): TenantPhoneCountry {
  const { data } = useGetMyTenant({ query: { staleTime: 10 * 60 * 1000 } });
  const tenant = data?.data;
  const countryName = tenant?.country ?? '';

  if (!countryName) return FALLBACK;

  const match = WORLD_COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase(),
  );

  if (!match) return FALLBACK;

  return {
    countryCode:  match.code,
    callingCode:  match.callingCode,
    phoneExample: match.phoneExample,
    country:      match,
  };
}
