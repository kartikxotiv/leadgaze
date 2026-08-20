import assert from 'node:assert/strict';
import test from 'node:test';

import { EntitlementError, EntitlementService } from './service.ts';

const workspaceId = '00000000-0000-4000-8000-000000000001';
const featureId = '00000000-0000-4000-8000-000000000002';
const moduleId = '00000000-0000-4000-8000-000000000003';

function context(features) {
  return {
    workspace_id: workspaceId,
    module_key: 'sales',
    plan: {
      plan_key: 'free_forever',
      plan_name: 'Free Forever',
      subscription_status: 'free',
      module_status: 'active',
    },
    features,
  };
}

function numericFeature(limit = 2, usage = 0) {
  return {
    is_enabled: true,
    limit_type: 'numeric',
    limit_value: limit,
    current_usage: usage,
    is_near_limit: false,
    is_at_limit: usage >= limit,
  };
}

function createRepository(overrides = {}) {
  const calls = { contexts: 0, releases: 0, events: [] };
  const repository = {
    async loadContext() {
      calls.contexts += 1;
      return context({
        'sales.leads': numericFeature(),
        'sales.import_export': {
          is_enabled: true,
          limit_type: 'boolean',
          current_usage: 0,
        },
      });
    },
    async findFeature(_moduleKey, featureKey) {
      return {
        id: featureId,
        moduleId,
        featureKey,
        featureName: 'Leads',
        dataType: featureKey === 'sales.leads' ? 'numeric' : 'boolean',
      };
    },
    async tryConsume(_workspace, _feature, quantity) {
      return {
        allowed: true,
        reason: null,
        currentUsage: quantity,
        limit: 2,
        remaining: 2 - quantity,
      };
    },
    async release() {
      calls.releases += 1;
    },
    async recordUsageEvent(event) {
      calls.events.push(event);
    },
    async listActivePlans() {
      return [
        {
          id: 'free',
          plan_key: 'free_forever',
          plan_name: 'Free Forever',
          display_order: 0,
        },
        {
          id: 'growth',
          plan_key: 'growth',
          plan_name: 'Growth',
          display_order: 2,
        },
      ];
    },
    async getEffectivePlanEntitlement() {
      return {
        is_enabled: true,
        limit_value: 5_000,
        limit_type: 'numeric',
        enum_value: null,
        resolved_from_plan_key: 'growth',
      };
    },
    ...overrides,
  };
  return { repository, calls };
}

test('loads one entitlement context per workspace/module/request', async () => {
  const { repository, calls } = createRepository();
  const service = new EntitlementService(repository);
  await Promise.all([
    service.getContext(workspaceId, 'sales'),
    service.requireBooleanFeature(workspaceId, 'sales', 'sales.import_export'),
  ]);
  assert.equal(calls.contexts, 1);
});

test('returns a recommended upgrade for a disabled feature', async () => {
  const { repository } = createRepository({
    async loadContext() {
      return context({
        'sales.zapier': {
          is_enabled: false,
          limit_type: 'boolean',
          current_usage: 0,
        },
      });
    },
  });
  const service = new EntitlementService(repository);
  await assert.rejects(
    service.requireBooleanFeature(workspaceId, 'sales', 'sales.zapier'),
    (error) => {
      assert.ok(error instanceof EntitlementError);
      assert.equal(error.code, 'FEATURE_NOT_INCLUDED');
      assert.equal(error.data.recommendedUpgrade.planKey, 'growth');
      return true;
    },
  );
});

test('releases a reservation when the business write fails', async () => {
  const { repository, calls } = createRepository();
  const service = new EntitlementService(repository);
  await assert.rejects(
    service.withUsageReservation(
      {
        workspaceId,
        moduleKey: 'sales',
        featureKey: 'sales.leads',
        resourceType: 'lead',
      },
      async () => {
        throw new Error('insert failed');
      },
    ),
    /insert failed/,
  );
  assert.equal(calls.releases, 1);
  assert.equal(calls.events.length, 0);
});

test('commits successful writes and records usage', async () => {
  const { repository, calls } = createRepository();
  const service = new EntitlementService(repository);
  await service.withUsageReservation(
    {
      workspaceId,
      moduleKey: 'sales',
      featureKey: 'sales.leads',
      resourceType: 'lead',
    },
    async () => ({ id: '00000000-0000-4000-8000-000000000004' }),
    (created) => ({ resourceId: created.id }),
  );
  assert.equal(calls.releases, 0);
  assert.equal(calls.events[0].eventType, 'created');
});

test('blocks over-limit consumption with upgrade guidance', async () => {
  const { repository } = createRepository({
    async tryConsume() {
      return {
        allowed: false,
        reason: 'limit_exceeded',
        currentUsage: 2,
        limit: 2,
        remaining: 0,
      };
    },
  });
  const service = new EntitlementService(repository);
  await assert.rejects(
    service.reserveUsage({
      workspaceId,
      moduleKey: 'sales',
      featureKey: 'sales.leads',
      resourceType: 'lead',
    }),
    (error) => {
      assert.ok(error instanceof EntitlementError);
      assert.equal(error.code, 'FEATURE_LIMIT_EXCEEDED');
      assert.equal(error.data.recommendedUpgrade.planKey, 'growth');
      return true;
    },
  );
});

test('blocks new writes for an inactive module subscription', async () => {
  const { repository } = createRepository({
    async loadContext() {
      const result = context({ 'sales.leads': numericFeature() });
      result.plan.module_status = 'suspended';
      return result;
    },
  });
  const service = new EntitlementService(repository);
  await assert.rejects(
    service.reserveUsage({
      workspaceId,
      moduleKey: 'sales',
      featureKey: 'sales.leads',
      resourceType: 'lead',
    }),
    (error) => {
      assert.ok(error instanceof EntitlementError);
      assert.equal(error.code, 'PAYMENT_REQUIRED');
      return true;
    },
  );
});

test('feature-flagged workspaces bypass checks without changing counters', async () => {
  const { repository, calls } = createRepository({
    async tryConsume() {
      throw new Error('counter should not be touched');
    },
  });
  const service = new EntitlementService(repository, () => false);

  assert.equal(
    await service.requireBooleanFeature(
      workspaceId,
      'sales',
      'sales.import_export',
    ),
    null,
  );
  const result = await service.withUsageReservation(
    {
      workspaceId,
      moduleKey: 'sales',
      featureKey: 'sales.leads',
      resourceType: 'lead',
    },
    async () => 'created',
  );

  assert.equal(result, 'created');
  assert.equal(calls.contexts, 0);
  assert.equal(calls.releases, 0);
  assert.equal(calls.events.length, 0);
});
