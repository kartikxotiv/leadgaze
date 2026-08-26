import assert from 'node:assert/strict';
import test from 'node:test';

import { matchSalesServiceBundle } from './bundle-rules.ts';

test('same-plan Sales and Service seats select bundle pricing', () => {
  assert.deepEqual(
    matchSalesServiceBundle([
      { productKey: 'sales', planKey: 'launch', seats: 5 },
      { productKey: 'service_cloud', planKey: 'launch', seats: 5 },
    ]),
    {
      bundleKey: 'sales_service_launch_bundle',
      planKey: 'launch',
      seats: 5,
    },
  );
});

test('mixed plans and different seat quantities do not receive bundle pricing', () => {
  assert.equal(
    matchSalesServiceBundle([
      { productKey: 'sales', planKey: 'growth', seats: 4 },
      { productKey: 'service_cloud', planKey: 'scale', seats: 4 },
    ]),
    null,
  );
  assert.equal(
    matchSalesServiceBundle([
      { productKey: 'sales', planKey: 'growth', seats: 4 },
      { productKey: 'service_cloud', planKey: 'growth', seats: 3 },
    ]),
    null,
  );
});

test('Free Forever and single-module checkouts are not bundles', () => {
  assert.equal(
    matchSalesServiceBundle([
      { productKey: 'sales', planKey: 'free_forever', seats: 1 },
      { productKey: 'service_cloud', planKey: 'free_forever', seats: 1 },
    ]),
    null,
  );
  assert.equal(
    matchSalesServiceBundle([
      { productKey: 'sales', planKey: 'growth', seats: 1 },
    ]),
    null,
  );
});
