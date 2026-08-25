import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kit/supabase/database';

import { SubscriptionApiError, assertDatabaseResult } from './errors';

type Client = SupabaseClient<Database>;

export class SubscriptionRepository {
  constructor(private readonly client: Client) {}

  async applyDueChanges(workspaceId: string) {
    const result = await this.client.rpc('apply_due_subscription_changes', {
      p_workspace_id: workspaceId,
    });
    assertDatabaseResult(
      result.error,
      'Unable to apply due subscription changes',
    );
  }

  async getPublicPricingRows() {
    const [plans, modules, prices, features, bundles, bundleModules] =
      await Promise.all([
        this.client
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        this.client
          .from('subscription_products')
          .select('id, product_key, display_name, description')
          .eq('is_active', true)
          .eq('is_public', true)
          .in('product_key', ['sales', 'service_cloud']),
        this.client
          .from('module_plan_prices')
          .select('*')
          .eq('is_active', true),
        this.client
          .from('feature_catalog')
          .select('module_id, feature_name, feature_category')
          .eq('is_active', true),
        this.client.from('bundles').select('*').eq('is_active', true),
        this.client.from('bundle_modules').select('bundle_id, module_id'),
      ]);

    for (const [result, label] of [
      [plans, 'plans'],
      [modules, 'modules'],
      [prices, 'module prices'],
      [features, 'features'],
      [bundles, 'bundles'],
      [bundleModules, 'bundle modules'],
    ] as const) {
      assertDatabaseResult(result.error, `Unable to load ${label}`);
    }

    return {
      plans: plans.data ?? [],
      modules: modules.data ?? [],
      prices: prices.data ?? [],
      features: features.data ?? [],
      bundles: bundles.data ?? [],
      bundleModules: bundleModules.data ?? [],
    };
  }

  async getWorkspaceSubscription(workspaceId: string) {
    const result = await this.client
      .from('workspace_subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to load workspace subscription');
    return result.data;
  }

  async getWorkspacePlanRows(workspaceId: string) {
    const [subscription, modules, changes, seats] = await Promise.all([
      this.client
        .from('workspace_subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      this.client
        .from('workspace_module_subscriptions')
        .select(
          '*, subscription_products!workspace_module_subscriptions_module_id_fkey(product_key, display_name), plans!workspace_module_subscriptions_plan_id_fkey(plan_key, plan_name), bundles(bundle_key)',
        )
        .eq('workspace_id', workspaceId)
        .in('status', ['active', 'trial', 'suspended']),
      this.client
        .from('subscription_changes')
        .select(
          '*, from_plan:plans!subscription_changes_from_plan_id_fkey(plan_key), to_plan:plans!subscription_changes_to_plan_id_fkey(plan_key), workspace_module_subscriptions!subscription_changes_module_subscription_fkey(module_id, subscription_products!workspace_module_subscriptions_module_id_fkey(product_key))',
        )
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('effective_at'),
      this.client
        .from('workspace_module_seats')
        .select('id, product_id, seats_purchased, seats_used')
        .eq('workspace_id', workspaceId),
    ]);
    assertDatabaseResult(subscription.error, 'Unable to load current plan');
    assertDatabaseResult(modules.error, 'Unable to load module plans');
    assertDatabaseResult(changes.error, 'Unable to load pending changes');
    assertDatabaseResult(seats.error, 'Unable to load workspace seats');
    return {
      subscription: subscription.data,
      modules: modules.data ?? [],
      changes: changes.data ?? [],
      seats: seats.data ?? [],
    };
  }

  async getModuleUserCount(workspaceId: string, moduleIds: string[]) {
    if (moduleIds.length === 0) return new Map<string, number>();
    const result = await this.client
      .from('workspace_module_users')
      .select('module_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .in('module_id', moduleIds);
    assertDatabaseResult(result.error, 'Unable to load module user counts');
    const counts = new Map<string, number>();
    for (const row of result.data ?? []) {
      counts.set(row.module_id, (counts.get(row.module_id) ?? 0) + 1);
    }
    return counts;
  }

  async getUsageRows(workspaceId: string, moduleKey: string) {
    const productModule = await this.getModule(moduleKey);
    const [subscription, counters, features] = await Promise.all([
      this.client
        .from('workspace_module_subscriptions')
        .select('plan_id, plans(plan_key)')
        .eq('workspace_id', workspaceId)
        .eq('module_id', productModule.id)
        .maybeSingle(),
      this.client
        .from('usage_counters')
        .select('feature_id, current_usage, limit_value')
        .eq('workspace_id', workspaceId)
        .eq('module_id', productModule.id),
      this.client
        .from('feature_catalog')
        .select('id, feature_key, feature_name, data_type')
        .eq('module_id', productModule.id)
        .eq('is_active', true)
        .eq('data_type', 'numeric'),
    ]);
    assertDatabaseResult(subscription.error, 'Unable to load module plan');
    assertDatabaseResult(counters.error, 'Unable to load usage counters');
    assertDatabaseResult(features.error, 'Unable to load usage features');
    if (!subscription.data) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit plan for this module',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    return {
      module: productModule,
      subscription: subscription.data,
      counters: counters.data ?? [],
      features: features.data ?? [],
    };
  }

  async getModule(moduleKey: string) {
    const result = await this.client
      .from('subscription_products')
      .select('id, product_key, display_name')
      .eq('product_key', moduleKey)
      .eq('is_active', true)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to load module');
    if (!result.data) {
      throw new SubscriptionApiError('Module not found', 404, 'NOT_FOUND');
    }
    return result.data;
  }

  async getPlan(planKey: string) {
    const result = await this.client
      .from('plans')
      .select('*')
      .eq('plan_key', planKey)
      .eq('is_active', true)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to load plan');
    if (!result.data) {
      throw new SubscriptionApiError('Plan not found', 404, 'NOT_FOUND');
    }
    return result.data;
  }

  async getModulePrice(moduleId: string, planId: string) {
    const result = await this.client
      .from('module_plan_prices')
      .select('*')
      .eq('module_id', moduleId)
      .eq('plan_id', planId)
      .eq('is_active', true)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to load module price');
    if (!result.data) {
      throw new SubscriptionApiError(
        'No active price is configured for this module and plan',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    return result.data;
  }

  async getModuleSubscription(workspaceId: string, moduleId: string) {
    const result = await this.client
      .from('workspace_module_subscriptions')
      .select('*, plans(plan_key, display_order, is_paid)')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to load module subscription');
    return result.data;
  }

  async getModuleUsers(workspaceId: string, moduleId: string) {
    const result = await this.client
      .from('workspace_module_users')
      .select(
        '*, accounts!workspace_module_users_user_id_fkey(id, name, email, picture_url)',
      )
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .order('assigned_at', { ascending: false });
    assertDatabaseResult(result.error, 'Unable to load module users');
    return result.data ?? [];
  }

  async assertAcceptedWorkspaceMember(workspaceId: string, userId: string) {
    const result = await this.client
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle();
    assertDatabaseResult(result.error, 'Unable to validate workspace member');
    if (!result.data) {
      throw new SubscriptionApiError(
        'The user is not an accepted workspace member',
        404,
        'NOT_FOUND',
      );
    }
  }

  get clientInstance() {
    return this.client;
  }
}
