import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { createSubscriptionService } from '~/lib/subscriptions/service';

import { PublicPricingPage } from './pricing-page';

export const revalidate = 3600;

export default async function PricingPage() {
  const client = getSupabaseServerAdminClient();
  const pricing = await createSubscriptionService(client).getPublicPricing();
  const [features, entitlements, plans] = await Promise.all([
    client
      .from('feature_catalog')
      .select('id, module_id, feature_key, feature_name, data_type')
      .eq('is_active', true)
      .order('feature_key'),
    client
      .from('plan_entitlements')
      .select('plan_id, feature_id, is_enabled, limit_value, enum_value'),
    client
      .from('plans')
      .select('id, plan_key, parent_plan_id')
      .eq('is_active', true),
  ]);
  if (features.error) throw features.error;
  if (entitlements.error) throw entitlements.error;
  if (plans.error) throw plans.error;

  const planById = new Map((plans.data ?? []).map((plan) => [plan.id, plan]));
  const direct = new Map(
    (entitlements.data ?? []).map((row) => [
      `${row.plan_id}:${row.feature_id}`,
      row,
    ]),
  );
  const matrix = (features.data ?? []).map((feature) => ({
    featureKey: feature.feature_key,
    featureName: feature.feature_name,
    moduleId: feature.module_id,
    values: Object.fromEntries(
      (plans.data ?? []).map((plan) => {
        let cursor: typeof plan | undefined = plan;
        let value: (typeof entitlements.data)[number] | undefined;
        while (cursor && !value) {
          value = direct.get(`${cursor.id}:${feature.id}`);
          cursor = cursor.parent_plan_id
            ? planById.get(cursor.parent_plan_id)
            : undefined;
        }
        const displayValue = !value?.is_enabled
          ? '—'
          : feature.data_type === 'numeric'
            ? (value.limit_value ?? 'Unlimited')
            : feature.data_type === 'enum'
              ? (value.enum_value ?? 'Included')
              : 'Included';
        return [plan.plan_key, displayValue];
      }),
    ),
  }));

  return <PublicPricingPage pricing={pricing} featureMatrix={matrix} />;
}
