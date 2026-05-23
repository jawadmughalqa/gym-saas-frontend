import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanFeatures, type PlanFeatureKey } from '@/hooks/use-plan-features';
import { useAuthStore } from '@/stores/auth.store';

interface FeatureGateProps {
  /** The feature flag key this content requires */
  feature: PlanFeatureKey;
  /** Human-readable feature name for the upgrade prompt */
  featureName?: string;
  children: React.ReactNode;
}

/**
 * Wraps content that requires a specific plan feature.
 * If the feature is disabled on the tenant's plan, shows an upgrade prompt.
 * For non-gym_owner roles (trainers, members, super_admin) always renders children.
 */
export default function FeatureGate({ feature, featureName, children }: FeatureGateProps) {
  const navigate    = useNavigate();
  const role        = useAuthStore((s) => s.user?.role);
  const { hasFeature, isLoading } = usePlanFeatures();

  // Non-tenant roles always see the content
  if (role === 'super_admin' || role === 'member' || role === 'trainer') {
    return <>{children}</>;
  }

  // Don't block while loading
  if (isLoading) return <>{children}</>;

  if (hasFeature(feature)) return <>{children}</>;

  // ── Upgrade prompt ────────────────────────────────────────────────────────
  const displayName = featureName ?? feature;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4 py-12">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {displayName} not included in your plan
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Upgrade your subscription to unlock <strong>{displayName}</strong> and
        access all the advanced features your gym needs to grow.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button className="gap-2" onClick={() => navigate('/settings/pricing')}>
          <Sparkles className="h-4 w-4" />
          View Plans & Upgrade
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
