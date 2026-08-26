import { NextRequest, NextResponse } from 'next/server';

import { createHash } from 'node:crypto';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { BackendBillingService } from '~/lib/subscriptions/backend-billing-service';
import { SubscriptionNotificationService } from '~/lib/subscriptions/notification-service';
import { RazorpayInvoiceProvider } from '~/lib/subscriptions/razorpay-provider';

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    invoice?: { entity?: Record<string, unknown> };
    payment_link?: { entity?: Record<string, unknown> };
    payment?: { entity?: Record<string, unknown> };
  };
};

const stringValue = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : null;

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseServerAdminClient() as any;
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing x-razorpay-signature header' },
      { status: 400 },
    );
  }

  const provider = new RazorpayInvoiceProvider();
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let webhook: RazorpayWebhookPayload;
  try {
    webhook = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  const eventType = webhook.event ?? 'unknown';
  const providerEventId =
    request.headers.get('x-razorpay-event-id') ??
    createHash('sha256').update(rawBody).digest('hex');
  const claim = await client.from('payment_events').insert({
    workspace_id: null,
    seat_id: null,
    payment_provider: 'razorpay',
    provider_event_id: providerEventId,
    event_type: eventType,
    payload: webhook,
    processed_at: null,
  });
  if (claim.error) {
    if (claim.error.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw claim.error;
  }

  try {
    const invoiceEntity = webhook.payload?.invoice?.entity;
    const linkEntity = webhook.payload?.payment_link?.entity;
    const paymentEntity = webhook.payload?.payment?.entity;
    const notes = (invoiceEntity?.notes ??
      linkEntity?.notes ??
      paymentEntity?.notes ??
      {}) as Record<string, unknown>;
    const backendInvoiceId = stringValue(notes.backend_invoice_id);
    let providerInvoiceId =
      stringValue(invoiceEntity?.id) ?? stringValue(paymentEntity?.invoice_id);

    if (!providerInvoiceId && backendInvoiceId) {
      const invoice = await client
        .from('backend_billing_invoices')
        .select('razorpay_invoice_id')
        .eq('id', backendInvoiceId)
        .single();
      if (invoice.error) throw invoice.error;
      providerInvoiceId = invoice.data.razorpay_invoice_id;
    }

    if (eventType === 'invoice.paid' || eventType === 'payment_link.paid') {
      if (!providerInvoiceId && !backendInvoiceId) {
        throw new Error('Paid webhook does not identify a backend invoice');
      }
      if (providerInvoiceId && backendInvoiceId) {
        const repairLink = await client
          .from('backend_billing_invoices')
          .update({ razorpay_invoice_id: providerInvoiceId })
          .eq('id', backendInvoiceId)
          .is('razorpay_invoice_id', null);
        if (repairLink.error) throw repairLink.error;
      }
      await new BackendBillingService(client).markInvoicePaid({
        razorpayInvoiceId: providerInvoiceId ?? undefined,
        backendInvoiceId: backendInvoiceId ?? undefined,
        razorpayPaymentId: stringValue(paymentEntity?.id),
        paidAt: webhook.created_at
          ? new Date(webhook.created_at * 1000)
          : new Date(),
      });
    } else if (eventType === 'payment.failed') {
      const failedInvoice = backendInvoiceId
        ? await client
            .from('backend_billing_invoices')
            .select('id, workspace_id, invoice_number, payment_url')
            .eq('id', backendInvoiceId)
            .maybeSingle()
        : providerInvoiceId
          ? await client
              .from('backend_billing_invoices')
              .select('id, workspace_id, invoice_number, payment_url')
              .eq('razorpay_invoice_id', providerInvoiceId)
              .maybeSingle()
          : null;
      if (failedInvoice?.error) throw failedInvoice.error;
      if (failedInvoice?.data) {
        await new SubscriptionNotificationService().emitBestEffort({
          workspaceId: failedInvoice.data.workspace_id,
          eventType: 'payment_failed',
          eventKey: `payment_failed:${providerEventId}`,
          title: `Payment failed for ${failedInvoice.data.invoice_number}`,
          message:
            'The payment was not completed. Retry using the invoice payment link.',
          email: true,
          actionUrl: failedInvoice.data.payment_url ?? '/org/subscription',
          actionLabel: 'Retry payment',
        });
      }
    } else if (
      eventType === 'invoice.expired' ||
      eventType === 'payment_link.expired'
    ) {
      const match = providerInvoiceId
        ? await client
            .from('backend_billing_invoices')
            .update({ status: 'expired' })
            .eq('razorpay_invoice_id', providerInvoiceId)
            .in('status', ['draft', 'issued'])
            .select('id, workspace_id, invoice_number')
            .maybeSingle()
        : backendInvoiceId
          ? await client
              .from('backend_billing_invoices')
              .update({ status: 'expired' })
              .eq('id', backendInvoiceId)
              .in('status', ['draft', 'issued'])
              .select('id, workspace_id, invoice_number')
              .maybeSingle()
          : null;
      if (match?.error) throw match.error;
      if (match?.data) {
        const failedChange = await client
          .from('backend_seat_changes')
          .update({
            status: 'failed',
            processing_error: 'Payment invoice expired',
          })
          .eq('invoice_id', match.data.id)
          .eq('status', 'awaiting_payment');
        if (failedChange.error) throw failedChange.error;
        await new SubscriptionNotificationService().emitBestEffort({
          workspaceId: match.data.workspace_id,
          eventType: 'invoice_expired',
          eventKey: `invoice_expired:${match.data.id}`,
          title: `Invoice ${match.data.invoice_number} expired`,
          message:
            'Payment was not received, so the requested upgrade was not applied.',
          email: true,
        });
      }
    }

    await client
      .from('payment_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('payment_provider', 'razorpay')
      .eq('provider_event_id', providerEventId);
  } catch (error) {
    await client
      .from('payment_events')
      .delete()
      .eq('payment_provider', 'razorpay')
      .eq('provider_event_id', providerEventId)
      .is('processed_at', null);
    console.error('[RazorpayWebhook] processing failed', error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
