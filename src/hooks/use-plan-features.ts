import { useAuthStore } from '@/stores/auth.store';
import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import type { TenantFeatureFlags } from '@/api/generated/schemas/tenantFeatureFlags';

// All features ON — used for super_admin, non-tenant roles, and loading state
const ALL_FEATURES_ENABLED: Required<TenantFeatureFlags> = {
  members:       true,
  trainers:      true,
  billing:       true,
  attendance:    true,
  reports:       true,
  expenses:      true,
  branches:      true,
  equipment:     true,
  notifications: true,
  discounts:     true,
  fitPlan:       true,
  memberPortal:  true,
};

export type PlanFeatureKey = keyof Required<TenantFeatureFlags>;

export interface UsePlanFeaturesResult {
  features:    Required<TenantFeatureFlags>;
  isLoading:   boolean;
  /** Returns true if the given feature flag is enabled on this tenant's plan */
  hasFeature:  (key: PlanFeatureKey) => boolean;
}

/**
 * Returns the current tenant's feature flags.
 *
 * - Super admin: all features enabled (they manage everything)
 * - Members / trainers: all features enabled (they only see their own portal)
 * - Gym owner + staff: reads live from /tenants/me
 *
 * During loading the hook returns all-features-enabled so the UI
 * doesn't flicker/hide nav items while the request resolves.
 */
export function usePlanFeatures(): UsePlanFeaturesResult {
  const role = useAuthStore((s) => s.user?.role);

  // Only fetch for gym-tenant roles — everyone else gets full access
  const shouldFetch =
    role === 'gym_owner' || role === 'branch_manager' || role === 'staff';

  const { data, isLoading } = useGetMyTenant({
    query: {
      enabled:   shouldFetch,
      staleTime: 1000 * 60 * 5, // 5-min cache
    },
  });

  if (!shouldFetch) {
    return { features: ALL_FEATURES_ENABLED, isLoading: false, hasFeature: () => true };
  }

  // While loading, show all items (prevent nav flicker)
  if (isLoading || !data?.data?.featureFlags) {
    return {
      features:   ALL_FEATURES_ENABLED,
      isLoading:  true,
      hasFeature: () => true,
    };
  }

  const raw = data.data.featureFlags as Record<string, boolean | undefined>;

  const features: Required<TenantFeatureFlags> = {
    members:       raw['members']       ?? true,
    trainers:      raw['trainers']      ?? true,
    billing:       raw['billing']       ?? true,
    attendance:    raw['attendance']    ?? true,
    reports:       raw['reports']       ?? false,
    expenses:      raw['expenses']      ?? false,
    branches:      raw['branches']      ?? false,
    equipment:     raw['equipment']     ?? false,
    notifications: raw['notifications'] ?? true,
    discounts:     raw['discounts']     ?? false,
    fitPlan:       raw['fitPlan']       ?? false,
    memberPortal:  raw['memberPortal']  ?? true,
  };

  return {
    features,
    isLoading: false,
    hasFeature: (key) => features[key],
  };
}
