import type { PlanKey, SubscriptionModuleKey } from './contracts';

type BundleCandidate = {
  productKey: SubscriptionModuleKey;
  planKey?: PlanKey;
  seats: number;
};

export function matchSalesServiceBundle(items: BundleCandidate[]) {
  if (items.length !== 2) return null;
  const sales = items.find((item) => item.productKey === 'sales');
  const service = items.find((item) => item.productKey === 'service_cloud');
  if (!sales || !service) return null;
  const salesPlan = sales.planKey ?? 'growth';
  const servicePlan = service.planKey ?? 'growth';
  if (
    salesPlan !== servicePlan ||
    salesPlan === 'free_forever' ||
    sales.seats !== service.seats
  ) {
    return null;
  }
  return {
    bundleKey: `sales_service_${salesPlan}_bundle`,
    planKey: salesPlan,
    seats: sales.seats,
  };
}
