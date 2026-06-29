import { useAuthStore } from '@/stores/auth.store';
import { useGetMyTenant } from '@/api/generated/tenants/tenants';
import type { TenantFeatureFlags } from '@/api/generated/schemas/tenantFeatureFlags';

// All features ON — used only for super_admin (no tenant) and while loading
const ALL_FEATURES_ENABLED: Required<TenantFeatureFlags> = {
  members:             true,
  trainers:            true,
  billing:             true,
  attendance:          true,
  reports:             true,
  expenses:            true,
  branches:            true,
  equipment:           true,
  notifications:       true,
  discounts:           true,
  fitPlan:             true,
  memberPortal:        true,
  walkInLeads:         true,
  trainerPortal:       true,
  branchManagerPortal:  true,
  pos:                  true,
  notificationChannels: true,
  biometricAccess:      true,
  automatedCampaigns:   true,
};

export type PlanFeatureKey = keyof Required<TenantFeatureFlags>;

export interface UsePlanFeaturesResult {
  features:    Required<TenantFeatureFlags>;
  isLoading:   boolean;
  /** Returns true if the given feature flag is enabled on this tenant's plan */
  hasFeature:  (key: PlanFeatureKey) => boolean;
}

/**
 * Returns the feature flags from the current user's tenant plan.
 *
 * - super_admin: no tenant — all features enabled (they manage everything)
 * - Everyone else (gym_owner, branch_manager, staff, trainer, member):
 *   reads live from /tenants/me using the tenantId in their JWT
 *
 * During loading the hook returns all-features-enabled so the UI
 * doesn't flicker/hide nav items while the request resolves.
 *
 * This intentionally applies to member and trainer roles too, so that
 * plan-level restrictions (e.g. fitPlan disabled on Starter) are
 * enforced in the member portal.
 */
export function usePlanFeatures(): UsePlanFeaturesResult {
  const role     = useAuthStore((s) => s.user?.role);
  const tenantId = useAuthStore((s) => s.user?.tenantId);

  // super_admin has no tenant — give them full access to everything
  const isSuperAdmin = role === 'super_admin';
  // Any user with a tenantId should respect that tenant's plan feature flags
  const shouldFetch  = !isSuperAdmin && !!tenantId;

  const { data, isLoading } = useGetMyTenant({
    query: {
      enabled:   shouldFetch,
      staleTime: 1000 * 60 * 5, // 5-min cache — plan changes are infrequent
    },
  });

  // Super admin: all features on
  if (isSuperAdmin) {
    return { features: ALL_FEATURES_ENABLED, isLoading: false, hasFeature: () => true };
  }

  // No tenant associated with this user (shouldn't happen in practice)
  if (!tenantId) {
    return { features: ALL_FEATURES_ENABLED, isLoading: false, hasFeature: () => true };
  }

  // While loading, show all items to prevent nav flicker on first render
  if (isLoading || !data?.data?.featureFlags) {
    return {
      features:   ALL_FEATURES_ENABLED,
      isLoading:  true,
      hasFeature: () => true,
    };
  }

  const raw = data.data.featureFlags as Record<string, boolean | undefined>;

  const features: Required<TenantFeatureFlags> = {
    members:             raw['members']             ?? true,
    trainers:            raw['trainers']            ?? true,
    billing:             raw['billing']             ?? true,
    attendance:          raw['attendance']          ?? true,
    reports:             raw['reports']             ?? true,
    expenses:            raw['expenses']            ?? true,
    branches:            raw['branches']            ?? false,
    equipment:           raw['equipment']           ?? false,
    notifications:       raw['notifications']       ?? true,
    discounts:           raw['discounts']           ?? false,
    fitPlan:             raw['fitPlan']             ?? false,
    memberPortal:        raw['memberPortal']        ?? true,
    walkInLeads:         raw['walkInLeads']         ?? true,
    trainerPortal:       raw['trainerPortal']       ?? true,
    branchManagerPortal: raw['branchManagerPortal'] ?? false,
    pos:                  raw['pos']                  ?? false,
    notificationChannels: raw['notificationChannels'] ?? false,
    biometricAccess:      raw['biometricAccess']      ?? false,
    automatedCampaigns:   raw['automatedCampaigns']   ?? true,
  };

  return {
    features,
    isLoading: false,
    hasFeature: (key) => features[key],
  };
}
