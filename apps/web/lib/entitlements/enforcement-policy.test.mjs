import assert from 'node:assert/strict';
import test from 'node:test';

import { createEntitlementEnforcementPolicy } from './enforcement-policy.ts';

test('entitlement enforcement is disabled by default', () => {
  const policy = createEntitlementEnforcementPolicy({});
  assert.equal(policy('workspace-a'), false);
});

test('workspace allowlist supports progressive enforcement', () => {
  const policy = createEntitlementEnforcementPolicy({
    ENTITLEMENT_ENFORCEMENT_WORKSPACE_IDS: 'workspace-a, workspace-b',
  });
  assert.equal(policy('workspace-a'), true);
  assert.equal(policy('workspace-c'), false);
});

test('global flag enables enforcement for every workspace', () => {
  const policy = createEntitlementEnforcementPolicy({
    ENTITLEMENT_ENFORCEMENT_ENABLED: 'true',
  });
  assert.equal(policy('workspace-any'), true);
});
