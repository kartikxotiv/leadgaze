import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addModuleRequestSchema,
  bundleCheckoutRequestSchema,
  bundleSeatChangeRequestSchema,
  pricingCheckoutRequestSchema,
  providerSyncRequestSchema,
  removeModuleRequestSchema,
  startTrialRequestSchema,
} from './contracts.ts';

const workspaceId = '00000000-0000-4000-8000-000000000001';

test('trial selection rejects duplicate modules', () => {
  const result = startTrialRequestSchema.safeParse({
    workspaceId,
    selectedModules: ['sales', 'sales'],
  });
  assert.equal(result.success, false);
});

test('module lifecycle schemas accept the supported catalog keys', () => {
  assert.equal(
    addModuleRequestSchema.safeParse({
      workspaceId,
      moduleKey: 'service_cloud',
      planKey: 'growth',
      billingCycle: 'yearly',
    }).success,
    true,
  );
  assert.equal(
    removeModuleRequestSchema.safeParse({ workspaceId, moduleKey: 'sales' })
      .success,
    true,
  );
});

test('checkout only accepts local return paths', () => {
  const base = {
    workspaceId,
    moduleKey: 'sales',
    planKey: 'growth',
    billingCycle: 'monthly',
  };
  assert.equal(
    pricingCheckoutRequestSchema.safeParse({
      ...base,
      returnUrl: '/org/subscription',
    }).success,
    true,
  );
  assert.equal(
    pricingCheckoutRequestSchema.safeParse({
      ...base,
      returnUrl: 'https://attacker.invalid',
    }).success,
    false,
  );
});

test('provider synchronization uses Razorpay payment collection', () => {
  assert.equal(
    providerSyncRequestSchema.parse({ workspaceId }).provider,
    'razorpay',
  );
  assert.equal(
    providerSyncRequestSchema.safeParse({ workspaceId, provider: 'manual' })
      .success,
    false,
  );
});

test('bundle checkout and seat changes require positive shared seats', () => {
  assert.equal(
    bundleCheckoutRequestSchema.safeParse({
      workspaceId,
      bundleKey: 'sales_service_growth_bundle',
      billingCycle: 'yearly',
      seats: 3,
      returnUrl: '/org/subscription',
    }).success,
    true,
  );
  assert.equal(
    bundleSeatChangeRequestSchema.safeParse({
      workspaceId,
      bundleKey: 'sales_service_growth_bundle',
      newQuantity: 0,
    }).success,
    false,
  );
});
