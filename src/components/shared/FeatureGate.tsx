import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanFeatures, type PlanFeatureKey } from '@/hooks/use-plan-features';
import { useAuthStore } from '@/stores/auth.store';

interface FeatureGateProps {
  /** The feature flag key this content requires */
  feature: PlanFeatureKey;
  /** Human-readable feature name shown in the upgrade prompt */
  featureName?: string;
  children: React.ReactNode;
}

/**
 * Wraps content that requires a specific plan feature.
 *
 * If the feature is disabled on the tenant's plan, shows an upgrade prompt
 * instead of the content. Applies to ALL roles that belong to a tenant —
 * including members and trainers, so member-portal features like FitPlan
 * can be restricted by the gym owner's plan.
 *
 * Only super_admin is exempt (they have no tenant plan restriction).
 */
export default function FeatureGate({ feature, featureName, children }: FeatureGateProps) {
  const navigate           = useNavigate();
  const role               = useAuthStore((s) => s.user?.role);
  const { hasFeature, isLoading } = usePlanFeatures();

  // Super admin has no tenant — always see everything
  if (role === 'super_admin') return <>{children}</>;

  // Don't block while the plan is loading (prevent flash of upgrade screen)
  if (isLoading) return <>{children}</>;

  // Feature is enabled — render normally
  if (hasFeature(feature)) return <>{children}</>;

  // ── Feature is disabled: show upgrade prompt ──────────────────────────────
  const displayName = featureName ?? feature;

  // For members: direct them to contact their gym, not to upgrade themselves
  const isMemberOrTrainer = role === 'member' || role === 'trainer';

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4 py-12">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {displayName} is not available
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {isMemberOrTrainer
          ? <>
              <strong>{displayName}</strong> is not enabled on your gym's current plan.
              Contact your gym administrator to enable this feature.
            </>
          : <>
              Upgrade your subscription to unlock <strong>{displayName}</strong> and
              access all the advanced features your gym needs to grow.
            </>
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!isMemberOrTrainer && (
          <Button className="gap-2" onClick={() => navigate('/settings/pricing')}>
            <Sparkles className="h-4 w-4" />
            View Plans & Upgrade
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
