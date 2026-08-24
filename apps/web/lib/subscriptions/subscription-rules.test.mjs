import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPlanChangeDirection,
  getTrialStartRejection,
  shouldAttemptNotificationDelivery,
} from './subscription-rules.ts';

test('trial starts only for a free workspace that has never used one', () => {
  assert.equal(
    getTrialStartRejection({
      trialStartDate: null,
      subscriptionStatus: 'free',
    }),
    null,
  );
  assert.equal(
    getTrialStartRejection({
      trialStartDate: '2026-08-01T00:00:00.000Z',
      subscriptionStatus: 'free',
    }),
    'TRIAL_ALREADY_USED',
  );
  assert.equal(
    getTrialStartRejection({
      trialStartDate: null,
      subscriptionStatus: 'active',
    }),
    'CONFLICT',
  );
});

test('upgrades are immediate and downgrades are scheduled', () => {
  assert.equal(getPlanChangeDirection(1, 2), 'upgrade');
  assert.equal(getPlanChangeDirection(2, 1), 'downgrade');
  assert.equal(getPlanChangeDirection(2, 2), 'same');
});

test('cron retries pending and failed notifications but not sent ones', () => {
  assert.equal(shouldAttemptNotificationDelivery('pending'), true);
  assert.equal(shouldAttemptNotificationDelivery('failed'), true);
  assert.equal(shouldAttemptNotificationDelivery('sent'), false);
});
