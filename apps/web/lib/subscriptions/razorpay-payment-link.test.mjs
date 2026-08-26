import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRazorpayPaymentLinkPayload } from './razorpay-payment-link.ts';

test('Razorpay payment links redirect to Leadgaze after successful payment', () => {
  const payload = buildRazorpayPaymentLinkPayload({
    invoiceNumber: 'LG-20260825-ABC12345',
    description: 'Sales Growth subscription',
    customer: { name: 'Sales Team', email: 'owner@example.com' },
    currency: 'usd',
    amountMinor: 4900,
    expireBy: new Date('2026-09-01T00:00:00.000Z'),
    notes: { backend_invoice_id: 'invoice-id' },
    callbackUrl: 'https://app.leadgaze.com/org/subscription?payment=success',
  });

  assert.equal(payload.callback_method, 'get');
  assert.equal(
    payload.callback_url,
    'https://app.leadgaze.com/org/subscription?payment=success',
  );
  assert.equal(payload.amount, 4900);
  assert.equal(payload.currency, 'USD');
  assert.deepEqual(payload.notify, { email: false, sms: false });
});
