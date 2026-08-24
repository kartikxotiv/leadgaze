import { createClient } from '@supabase/supabase-js';

import assert from 'node:assert/strict';
import test from 'node:test';

const url = process.env.SUPABASE_TEST_URL;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const canRun = Boolean(url && serviceKey);

test(
  'concurrent requests cannot consume beyond a numeric limit',
  { skip: canRun ? false : 'local Supabase test credentials are not set' },
  async () => {
    const client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const accountId = 'b1000000-0000-4000-8000-000000000001';
    const workspaceId = 'b2000000-0000-4000-8000-000000000001';

    await client.from('workspaces').delete().eq('id', workspaceId);
    await client.from('accounts').delete().eq('id', accountId);

    try {
      const account = await client.from('accounts').insert({
        id: accountId,
        name: 'Concurrent Entitlement Test',
        email: 'concurrent-entitlement@leadgaze.invalid',
      });
      assert.equal(account.error, null);
      const workspace = await client.from('workspaces').insert({
        id: workspaceId,
        name: 'Concurrent Entitlement Test',
        slug: 'concurrent-entitlement-test',
        owner_id: accountId,
      });
      assert.equal(workspace.error, null);

      const [product, plan, feature] = await Promise.all([
        client
          .from('subscription_products')
          .select('id')
          .eq('product_key', 'sales')
          .single(),
        client.from('plans').select('id').eq('plan_key', 'growth').single(),
        client
          .from('feature_catalog')
          .select('id, module_id')
          .eq('feature_key', 'sales.leads')
          .single(),
      ]);
      assert.equal(product.error, null);
      assert.equal(plan.error, null);
      assert.equal(feature.error, null);

      const workspaceSubscription = await client
        .from('workspace_subscriptions')
        .insert({
          workspace_id: workspaceId,
          subscription_status: 'active',
          billing_cycle: 'monthly',
        })
        .select('id')
        .single();
      assert.equal(workspaceSubscription.error, null);
      const moduleSubscription = await client
        .from('workspace_module_subscriptions')
        .insert({
          workspace_subscription_id: workspaceSubscription.data.id,
          workspace_id: workspaceId,
          module_id: product.data.id,
          plan_id: plan.data.id,
          status: 'active',
        });
      assert.equal(moduleSubscription.error, null);

      const counter = await client
        .from('usage_counters')
        .update({ current_usage: 0, limit_value: 5 })
        .eq('workspace_id', workspaceId)
        .eq('feature_id', feature.data.id);
      assert.equal(counter.error, null);

      const attempts = await Promise.all(
        Array.from({ length: 20 }, () =>
          client.rpc('try_consume_entitlement', {
            p_workspace_id: workspaceId,
            p_feature_id: feature.data.id,
            p_quantity: 1,
          }),
        ),
      );
      for (const attempt of attempts) assert.equal(attempt.error, null);
      const allowed = attempts.filter(
        (attempt) => attempt.data?.allowed === true,
      );
      assert.equal(allowed.length, 5);

      const finalCounter = await client
        .from('usage_counters')
        .select('current_usage')
        .eq('workspace_id', workspaceId)
        .eq('feature_id', feature.data.id)
        .single();
      assert.equal(finalCounter.error, null);
      assert.equal(finalCounter.data.current_usage, 5);
    } finally {
      await client.from('workspaces').delete().eq('id', workspaceId);
      await client.from('accounts').delete().eq('id', accountId);
    }
  },
);
