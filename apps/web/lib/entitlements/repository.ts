import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@kit/supabase/database';

import type {
  EntitlementConsumption,
  EntitlementModuleKey,
  FeatureDefinition,
  UsageEventInput,
} from './types';

type PlanRow = {
  id: string;
  plan_key: string;
  plan_name: string;
  display_order: number;
};

export class EntitlementRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async loadContext(workspaceId: string, moduleKey: EntitlementModuleKey) {
    const { data, error } = await this.client.rpc(
      'get_workspace_entitlement_context',
      {
        p_workspace_id: workspaceId,
        p_module_key: moduleKey,
      },
    );

    if (error) throw error;
    return data;
  }

  async findFeature(
    moduleKey: EntitlementModuleKey,
    featureKey: string,
  ): Promise<FeatureDefinition | null> {
    const { data, error } = await this.client
      .from('feature_catalog')
      .select(
        'id,module_id,feature_key,feature_name,data_type,subscription_products!inner(product_key)',
      )
      .eq('feature_key', featureKey)
      .eq('subscription_products.product_key', moduleKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      moduleId: data.module_id,
      featureKey: data.feature_key,
      featureName: data.feature_name,
      dataType: data.data_type,
    };
  }

  async tryConsume(
    workspaceId: string,
    featureId: string,
    quantity: number,
  ): Promise<EntitlementConsumption> {
    const { data, error } = await this.client.rpc('try_consume_entitlement', {
      p_workspace_id: workspaceId,
      p_feature_id: featureId,
      p_quantity: quantity,
    });

    if (error) throw error;

    const result = (data ?? {}) as Record<string, Json | undefined>;
    return {
      allowed: result.allowed === true,
      reason: typeof result.reason === 'string' ? result.reason : null,
      currentUsage:
        typeof result.current_usage === 'number' ? result.current_usage : 0,
      limit: typeof result.limit === 'number' ? result.limit : null,
      remaining: typeof result.remaining === 'number' ? result.remaining : null,
    };
  }

  async release(workspaceId: string, featureId: string, quantity: number) {
    const { error } = await this.client.rpc('release_entitlement', {
      p_workspace_id: workspaceId,
      p_feature_id: featureId,
      p_quantity: quantity,
    });

    if (error) throw error;
  }

  async recordUsageEvent(input: UsageEventInput) {
    const { error } = await this.client.from('usage_events').insert({
      workspace_id: input.workspaceId,
      module_id: input.feature.moduleId,
      feature_id: input.feature.id,
      event_type: input.eventType,
      quantity: input.quantity,
      resource_id: input.resourceId ?? null,
      resource_type: input.resourceType ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) throw error;
  }

  async listActivePlans(): Promise<PlanRow[]> {
    const { data, error } = await this.client
      .from('plans')
      .select('id,plan_key,plan_name,display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getEffectivePlanEntitlement(planId: string, featureId: string) {
    const { data, error } = await this.client.rpc(
      'get_effective_plan_entitlement',
      {
        p_plan_id: planId,
        p_feature_id: featureId,
      },
    );

    if (error) throw error;
    return data[0] ?? null;
  }
}
