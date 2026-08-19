import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type Stripe from 'stripe';

import type { Database } from '@kit/supabase/database';

import { SubscriptionApiError } from './errors';

type Client = SupabaseClient<Database>;

const statusMap: Record<string, string> = {
  trialing: 'trial_active',
  active: 'active',
  past_due: 'past_due',
  unpaid: 'payment_failed',
  canceled: 'cancelled',
  paused: 'suspended',
  incomplete: 'payment_failed',
  incomplete_expired: 'expired',
};

export async function registerStripeCheckout(params: {
  client: Client;
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription;
}) {
  const { client, session, subscription } = params;
  const workspaceId = session.metadata?.workspace_id;
  if (!workspaceId) {
    throw new SubscriptionApiError(
      'Stripe checkout metadata is missing workspace_id',
      409,
      'ENTITLEMENT_CONFIGURATION_ERROR',
    );
  }
  const workspaceSubscription = await client
    .from('workspace_subscriptions')
    .select('id')
    .eq('workspace_id', workspaceId)
    .single();
  if (workspaceSubscription.error) throw workspaceSubscription.error;
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;
  if (!customerId) {
    throw new SubscriptionApiError(
      'Stripe checkout did not include a customer',
      409,
      'PROVIDER_ERROR',
    );
  }
  const account = await client
    .from('workspace_billing_accounts')
    .upsert(
      {
        workspace_id: workspaceId,
        provider: 'stripe',
        provider_customer_id: customerId,
        is_active: true,
      },
      { onConflict: 'workspace_id,provider' },
    )
    .select('id')
    .single();
  if (account.error) throw account.error;
  const firstItem = subscription.items.data[0];
  const billing = await client
    .from('workspace_billing_subscriptions')
    .upsert(
      {
        workspace_id: workspaceId,
        workspace_subscription_id: workspaceSubscription.data.id,
        billing_account_id: account.data.id,
        provider_subscription_id: subscription.id,
        provider_status: subscription.status,
        current_period_start: firstItem
          ? new Date(firstItem.current_period_start * 1000).toISOString()
          : null,
        current_period_end: firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: { checkout_session_id: session.id, items: {} },
      },
      { onConflict: 'billing_account_id,provider_subscription_id' },
    )
    .select('id')
    .single();
  if (billing.error) throw billing.error;
  return synchronizeStripeSubscription({ client, subscription });
}

export async function synchronizeStripeSubscription(params: {
  client: Client;
  subscription: Stripe.Subscription;
}) {
  const { client, subscription } = params;
  const billing = await client
    .from('workspace_billing_subscriptions')
    .select('id, workspace_id, workspace_subscription_id, metadata')
    .eq('provider_subscription_id', subscription.id)
    .maybeSingle();
  if (billing.error) throw billing.error;
  if (!billing.data) {
    throw new SubscriptionApiError(
      'No workspace billing subscription matches the Stripe subscription',
      404,
      'NOT_FOUND',
    );
  }
  const priceIds = subscription.items.data.map((item) => item.price.id);
  const mappings = priceIds.length
    ? await client
        .from('billing_provider_prices')
        .select('provider_price_id, price_ref_id')
        .eq('provider', 'stripe')
        .eq('price_ref_type', 'module_plan')
        .in('provider_price_id', priceIds)
    : { data: [], error: null };
  if (mappings.error) throw mappings.error;
  const priceRefIds = (mappings.data ?? []).map((row) => row.price_ref_id);
  const catalogPrices = priceRefIds.length
    ? await client
        .from('module_plan_prices')
        .select(
          'id, module_id, plan_id, monthly_price, annual_price, subscription_products!module_plan_prices_module_id_fkey(product_key), plans!module_plan_prices_plan_id_fkey(plan_key)',
        )
        .in('id', priceRefIds)
    : { data: [], error: null };
  if (catalogPrices.error) throw catalogPrices.error;
  const mappingByPrice = new Map(
    (mappings.data ?? []).map((row) => [
      row.provider_price_id,
      row.price_ref_id,
    ]),
  );
  const catalogById = new Map(
    (catalogPrices.data ?? []).map((row) => [row.id, row]),
  );
  const itemMap: Record<string, string> = {};
  const activeModuleIds: string[] = [];
  const now = new Date().toISOString();
  for (const item of subscription.items.data) {
    const catalog = catalogById.get(mappingByPrice.get(item.price.id) ?? '');
    if (!catalog) continue;
    const moduleJoin = Array.isArray(catalog.subscription_products)
      ? catalog.subscription_products[0]
      : catalog.subscription_products;
    const moduleKey = moduleJoin?.product_key;
    if (!moduleKey) continue;
    itemMap[moduleKey] = item.id;
    activeModuleIds.push(catalog.module_id);
    const current = await client
      .from('workspace_module_subscriptions')
      .select('id, plan_id, started_at')
      .eq('workspace_id', billing.data.workspace_id)
      .eq('module_id', catalog.module_id)
      .maybeSingle();
    if (current.error) throw current.error;
    const moduleUpsert = await client
      .from('workspace_module_subscriptions')
      .upsert(
        {
          workspace_subscription_id: billing.data.workspace_subscription_id,
          workspace_id: billing.data.workspace_id,
          module_id: catalog.module_id,
          plan_id: catalog.plan_id,
          status: subscription.status === 'trialing' ? 'trial' : 'active',
          monthly_amount: catalog.monthly_price,
          annual_amount: catalog.annual_price,
          started_at: current.data?.started_at ?? now,
          cancelled_at: null,
        },
        { onConflict: 'workspace_id,module_id' },
      );
    if (moduleUpsert.error) throw moduleUpsert.error;
    if (current.data && current.data.plan_id !== catalog.plan_id) {
      const applied = await client
        .from('subscription_changes')
        .update({ status: 'applied', applied_at: now })
        .eq('workspace_module_subscription_id', current.data.id)
        .eq('to_plan_id', catalog.plan_id)
        .eq('status', 'pending');
      if (applied.error) throw applied.error;
    }
  }
  const moduleQuery = await client
    .from('workspace_module_subscriptions')
    .select('id, module_id')
    .eq('workspace_id', billing.data.workspace_id)
    .in('status', ['active', 'trial']);
  if (moduleQuery.error) throw moduleQuery.error;
  for (const moduleRow of moduleQuery.data ?? []) {
    if (activeModuleIds.includes(moduleRow.module_id)) continue;
    const pendingDowngrade = await client
      .from('subscription_changes')
      .select('id, to_plan_id')
      .eq('workspace_module_subscription_id', moduleRow.id)
      .eq('change_type', 'plan_downgrade')
      .eq('status', 'pending')
      .order('effective_at')
      .limit(1)
      .maybeSingle();
    if (pendingDowngrade.error) throw pendingDowngrade.error;
    if (pendingDowngrade.data?.to_plan_id) {
      const targetPrice = await client
        .from('module_plan_prices')
        .select('monthly_price, annual_price')
        .eq('module_id', moduleRow.module_id)
        .eq('plan_id', pendingDowngrade.data.to_plan_id)
        .single();
      if (targetPrice.error) throw targetPrice.error;
      const downgraded = await client
        .from('workspace_module_subscriptions')
        .update({
          plan_id: pendingDowngrade.data.to_plan_id,
          monthly_amount: targetPrice.data.monthly_price,
          annual_amount: targetPrice.data.annual_price,
          status: 'active',
          cancelled_at: null,
        })
        .eq('id', moduleRow.id);
      if (downgraded.error) throw downgraded.error;
      const appliedDowngrade = await client
        .from('subscription_changes')
        .update({ status: 'applied', applied_at: now })
        .eq('id', pendingDowngrade.data.id);
      if (appliedDowngrade.error) throw appliedDowngrade.error;
      continue;
    }
    const cancelled = await client
      .from('workspace_module_subscriptions')
      .update({ status: 'cancelled', cancelled_at: now })
      .eq('id', moduleRow.id);
    if (cancelled.error) throw cancelled.error;
    const applied = await client
      .from('subscription_changes')
      .update({ status: 'applied', applied_at: now })
      .eq('workspace_module_subscription_id', moduleRow.id)
      .eq('change_type', 'module_cancel')
      .eq('status', 'pending');
    if (applied.error) throw applied.error;
  }
  const firstItem = subscription.items.data[0];
  const periodStart = firstItem
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = firstItem
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;
  const billingUpdate = await client
    .from('workspace_billing_subscriptions')
    .update({
      provider_status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        ...(typeof billing.data.metadata === 'object'
          ? billing.data.metadata
          : {}),
        items: itemMap,
      },
    })
    .eq('id', billing.data.id);
  if (billingUpdate.error) throw billingUpdate.error;
  const workspaceUpdate = await client
    .from('workspace_subscriptions')
    .update({
      subscription_status: statusMap[subscription.status] ?? 'suspended',
      current_period_start: periodStart,
      current_period_end: periodEnd,
    })
    .eq('id', billing.data.workspace_subscription_id);
  if (workspaceUpdate.error) throw workspaceUpdate.error;
  return {
    workspaceId: billing.data.workspace_id,
    provider: 'stripe' as const,
    providerSubscriptionId: subscription.id,
    providerStatus: subscription.status,
    synchronizedAt: now,
  };
}
