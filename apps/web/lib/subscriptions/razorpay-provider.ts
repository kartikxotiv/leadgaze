import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { SubscriptionApiError } from './errors';

type RazorpayInvoiceInput = {
  invoiceNumber: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string | null;
  };
  currency: string;
  amountMinor: number;
  quantity: number;
  expireBy: Date;
  notes: Record<string, string>;
};

export type RazorpayInvoice = {
  id: string;
  status: string;
  short_url?: string | null;
  amount?: number;
  amount_due?: number;
  currency?: string;
};

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new SubscriptionApiError(
      `${name} is not configured`,
      503,
      'ENTITLEMENT_CONFIGURATION_ERROR',
    );
  }
  return value;
};

export class RazorpayInvoiceProvider {
  private readonly apiBaseUrl = 'https://api.razorpay.com/v1';

  async createInvoice(input: RazorpayInvoiceInput) {
    const response = await this.request<RazorpayInvoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        type: 'invoice',
        description: input.description,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          ...(input.customer.contact
            ? { contact: input.customer.contact }
            : {}),
        },
        line_items: [
          {
            name: input.description,
            description: `Leadgaze invoice ${input.invoiceNumber}`,
            amount: input.amountMinor,
            currency: input.currency,
            quantity: input.quantity,
          },
        ],
        expire_by: Math.floor(input.expireBy.getTime() / 1000),
        email_notify: 0,
        sms_notify: 0,
        notes: input.notes,
      }),
    });

    if (!response.id || !response.short_url) {
      throw new SubscriptionApiError(
        'Razorpay did not return an invoice payment URL',
        502,
        'PROVIDER_ERROR',
      );
    }

    return response;
  }

  async fetchInvoice(invoiceId: string) {
    return this.request<RazorpayInvoice>(
      `/invoices/${encodeURIComponent(invoiceId)}`,
      { method: 'GET' },
    );
  }

  async cancelInvoice(invoiceId: string) {
    return this.request<RazorpayInvoice>(
      `/invoices/${encodeURIComponent(invoiceId)}/cancel`,
      { method: 'POST' },
    );
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    const expected = createHmac(
      'sha256',
      getRequiredEnvironmentValue('RAZORPAY_WEBHOOK_SECRET'),
    )
      .update(rawBody)
      .digest('hex');
    const providedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return (
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer)
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const keyId = getRequiredEnvironmentValue('RAZORPAY_KEY_ID');
    const keySecret = getRequiredEnvironmentValue('RAZORPAY_KEY_SECRET');
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: { description?: string } })
      | null;
    if (!response.ok || !payload) {
      throw new SubscriptionApiError(
        payload?.error?.description ?? 'Razorpay invoice request failed',
        502,
        'PROVIDER_ERROR',
      );
    }
    return payload;
  }
}
