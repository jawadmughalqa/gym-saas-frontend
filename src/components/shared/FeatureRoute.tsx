import FeatureGate from './FeatureGate';
import type { PlanFeatureKey } from '@/hooks/use-plan-features';

interface FeatureRouteProps {
  feature: PlanFeatureKey;
  featureName: string;
  children: React.ReactNode;
}

/**
 * Wraps a route's element with FeatureGate so that navigating directly
 * to a URL for a disabled feature shows the upgrade/blocked screen
 * instead of the page content.
 *
 * Usage in router.tsx:
 *   element: <Lazy><FeatureRoute feature="billing" featureName="Billing"><BillingDashboard /></FeatureRoute></Lazy>
 *
 * Or more cleanly, wrap the Lazy element:
 *   element: <FR feature="reports" featureName="Reports"><Lazy><ReportsPage /></Lazy></FR>
 */
export default function FeatureRoute({ feature, featureName, children }: FeatureRouteProps) {
  return (
    <FeatureGate feature={feature} featureName={featureName}>
      {children}
    </FeatureGate>
  );
}
