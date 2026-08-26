import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBillingSettings } from './billing-settings-rules.ts';

test('loads billing timing configuration from database rows', () => {
  assert.deepEqual(
    parseBillingSettings([
      { setting_key: 'invoice_due_days', value_days: 10 },
      { setting_key: 'renewal_invoice_days', value_days: 14 },
      { setting_key: 'grace_period_days', value_days: 3 },
    ]),
    {
      invoiceDueDays: 10,
      renewalInvoiceDays: 14,
      gracePeriodDays: 3,
    },
  );
});

test('allows a zero-day grace period', () => {
  const settings = parseBillingSettings([
    { setting_key: 'invoice_due_days', value_days: 7 },
    { setting_key: 'renewal_invoice_days', value_days: 7 },
    { setting_key: 'grace_period_days', value_days: 0 },
  ]);
  assert.equal(settings.gracePeriodDays, 0);
});

test('rejects missing or invalid database billing settings', () => {
  assert.throws(
    () =>
      parseBillingSettings([
        { setting_key: 'invoice_due_days', value_days: 7 },
        { setting_key: 'renewal_invoice_days', value_days: 0 },
      ]),
    /renewal_invoice_days is missing or invalid/,
  );
});
