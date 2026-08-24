import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTrialReminderDays,
  getUsageWarningThreshold,
} from './lifecycle-rules.ts';

test('trial reminders trigger only at 7, 3, and 1 days', () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  assert.equal(
    getTrialReminderDays(new Date('2026-08-27T00:00:00.000Z'), now),
    7,
  );
  assert.equal(
    getTrialReminderDays(new Date('2026-08-23T00:00:00.000Z'), now),
    3,
  );
  assert.equal(
    getTrialReminderDays(new Date('2026-08-21T00:00:00.000Z'), now),
    1,
  );
  assert.equal(
    getTrialReminderDays(new Date('2026-08-25T00:00:00.000Z'), now),
    null,
  );
});

test('usage warning thresholds distinguish near and reached limits', () => {
  assert.equal(getUsageWarningThreshold(79, 100), null);
  assert.equal(getUsageWarningThreshold(80, 100), 80);
  assert.equal(getUsageWarningThreshold(99, 100), 80);
  assert.equal(getUsageWarningThreshold(100, 100), 100);
  assert.equal(getUsageWarningThreshold(150, 100), 100);
  assert.equal(getUsageWarningThreshold(5, null), null);
});
