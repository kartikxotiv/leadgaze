import 'server-only';

import { randomUUID } from 'node:crypto';

import { BackendBillingContextService } from './backend-billing-context-service';
import {
  BILLING_DAY_MS,
  type IssueInvoiceInput,
  minorUnits,
} from './backend-billing-types';
import { SubscriptionApiError } from './errors';

export abstract class BackendInvoiceService extends BackendBillingContextService {
  async markInvoicePaid(input: {
    razorpayInvoiceId?: string;
    backendInvoiceId?: string;
    razorpayPaymentId?: string | null;
    paidAt?: Date;
  }) {
    if (!input.razorpayInvoiceId && !input.backendInvoiceId) {
      throw new SubscriptionApiError(
        'A backend or Razorpay invoice ID is required',
        400,
        'BAD_REQUEST',
      );
    }
    let invoiceQuery = this.billingClient
      .from('backend_billing_invoices')
      .select('id, workspace_id, invoice_number, status, bundle_id');
    invoiceQuery = input.backendInvoiceId
      ? invoiceQuery.eq('id', input.backendInvoiceId)
      : invoiceQuery.eq('razorpay_invoice_id', input.razorpayInvoiceId);
    const invoice = await invoiceQuery.single();
    if (invoice.error || !invoice.data) {
      throw new SubscriptionApiError(
        'Razorpay invoice is not linked to a backend invoice',
        404,
        'NOT_FOUND',
      );
    }
    const result = invoice.data.bundle_id
      ? await this.billingClient.rpc('apply_paid_backend_bundle_invoice', {
          p_invoice_id: invoice.data.id,
          p_provider_payment_id: input.razorpayPaymentId ?? null,
          p_paid_at: (input.paidAt ?? new Date()).toISOString(),
        })
      : await this.billingClient.rpc('apply_paid_backend_invoice', {
          p_invoice_id: invoice.data.id,
          p_provider_payment_id: input.razorpayPaymentId ?? null,
          p_paid_at: (input.paidAt ?? new Date()).toISOString(),
        });
    if (result.error) throw result.error;
    if (result.data) {
      await this.notifications.emitBestEffort({
        workspaceId: invoice.data.workspace_id,
        eventType: 'invoice_paid',
        eventKey: `invoice_paid:${invoice.data.id}`,
        title: `Invoice ${invoice.data.invoice_number} paid`,
        message:
          'Payment was confirmed and the purchased plan or seats are now active.',
        email: true,
      });
    }
    return { applied: Boolean(result.data), invoiceId: invoice.data.id };
  }

  protected async issueInvoice(input: IssueInvoiceInput) {
    const existing = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, razorpay_invoice_id, payment_url, status')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      return {
        url: existing.data.payment_url ?? this.subscriptionUrl(),
        sessionId: existing.data.razorpay_invoice_id ?? existing.data.id,
        invoiceId: existing.data.id,
        paymentRequired: existing.data.status !== 'paid',
      };
    }

    await this.cancelOpenInvoices(
      input.workspaceId,
      input.moduleId,
      input.purpose === 'seat_increase'
        ? ['seat_increase']
        : input.purpose === 'renewal'
          ? ['renewal']
          : ['initial_purchase', 'plan_upgrade', 'module_add'],
    );

    const discount = await this.resolveDiscount({
      workspaceId: input.workspaceId,
      moduleId: input.moduleId,
      planId: input.planId,
      discountCode: input.discountCode,
      currency: input.currency,
    });
    const subtotal = input.unitAmountMinor * input.quantity;
    const discountAmount = discount
      ? discount.discount_type === 'percentage'
        ? Math.round((subtotal * Number(discount.discount_value)) / 100)
        : Math.min(subtotal, minorUnits(Number(discount.discount_value)))
      : 0;
    const total = subtotal - discountAmount;
    if (total < 1) {
      throw new SubscriptionApiError(
        'Paid invoices must total at least one minor currency unit',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }

    const now = new Date();
    const dueAt =
      input.dueAt ??
      new Date(now.getTime() + this.invoiceDueDays() * BILLING_DAY_MS);
    const invoiceNumber = `LG-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const created = await this.billingClient
      .from('backend_billing_invoices')
      .insert({
        invoice_number: invoiceNumber,
        workspace_id: input.workspaceId,
        module_id: input.moduleId,
        plan_id: input.planId,
        purpose: input.purpose,
        status: 'draft',
        billing_cycle: input.billingCycle,
        seats_before: input.seatsBefore,
        seats_after: input.seatsAfter,
        currency: input.currency.toUpperCase(),
        unit_amount_minor: input.unitAmountMinor,
        subtotal_amount_minor: subtotal,
        discount_amount_minor: discountAmount,
        tax_amount_minor: 0,
        total_amount_minor: total,
        discount_id: discount?.id ?? null,
        workspace_discount_id: discount?.workspace_discount_id ?? null,
        period_start: input.periodStart.toISOString(),
        period_end: input.periodEnd.toISOString(),
        due_at: dueAt.toISOString(),
        idempotency_key: input.idempotencyKey,
        created_by: input.actor.id,
        metadata: { plan_name: input.planName ?? null },
      })
      .select('id')
      .single();
    if (created.error) throw created.error;

    const item = await this.billingClient
      .from('backend_billing_invoice_items')
      .insert({
        invoice_id: created.data.id,
        item_type:
          input.purpose === 'seat_increase'
            ? 'seat_increase'
            : input.purpose === 'renewal'
              ? 'renewal'
              : 'plan_seats',
        description:
          `${input.moduleName} ${input.planName ?? ''} - ${input.quantity} seat${input.quantity === 1 ? '' : 's'}`.trim(),
        quantity: input.quantity,
        unit_amount_minor: input.unitAmountMinor,
        total_amount_minor: subtotal,
      });
    if (item.error) throw item.error;
    if (discountAmount > 0) {
      const discountItem = await this.billingClient
        .from('backend_billing_invoice_items')
        .insert({
          invoice_id: created.data.id,
          item_type: 'discount',
          description: discount?.display_name ?? 'Workspace discount',
          quantity: 1,
          unit_amount_minor: -discountAmount,
          total_amount_minor: -discountAmount,
          metadata: { discount_code: discount?.discount_code ?? null },
        });
      if (discountItem.error) throw discountItem.error;
    }

    if (input.purpose === 'seat_increase') {
      const change = await this.billingClient
        .from('backend_seat_changes')
        .insert({
          workspace_id: input.workspaceId,
          module_id: input.moduleId,
          seat_id: input.seatId,
          invoice_id: created.data.id,
          change_type: 'increase',
          seats_before: input.seatsBefore,
          seats_after: input.seatsAfter,
          status: 'awaiting_payment',
          effective_at: now.toISOString(),
          created_by: input.actor.id,
        });
      if (change.error) throw change.error;
    }

    const email =
      input.actor.email ?? (await this.getOwnerEmail(input.workspaceId));
    try {
      const razorpayInvoice = await this.provider.createInvoice({
        invoiceNumber,
        description: `${input.moduleName} ${input.planName ?? 'subscription'} (${input.billingCycle})`,
        customer: {
          name: input.workspace.name ?? 'Leadgaze customer',
          email,
        },
        currency: input.currency.toUpperCase(),
        amountMinor: total,
        expireBy: dueAt,
        notes: {
          backend_invoice_id: created.data.id,
          workspace_id: input.workspaceId,
          module_id: input.moduleId,
          purpose: input.purpose,
        },
        callbackUrl: this.paymentReturnUrl(input.returnUrl),
      });
      const update = await this.billingClient
        .from('backend_billing_invoices')
        .update({
          status: 'issued',
          issued_at: now.toISOString(),
          razorpay_invoice_id: razorpayInvoice.id,
          payment_url: razorpayInvoice.short_url,
        })
        .eq('id', created.data.id);
      if (update.error) throw update.error;

      await this.notifications.emitBestEffort({
        workspaceId: input.workspaceId,
        eventType: 'invoice_issued',
        eventKey: `invoice_issued:${created.data.id}`,
        title: `Invoice ${invoiceNumber} is ready`,
        message: `Confirm payment for ${input.seatsAfter} ${input.moduleName} seat${input.seatsAfter === 1 ? '' : 's'}. Access changes apply only after payment is confirmed.`,
        email: true,
        actionUrl: razorpayInvoice.short_url!,
        actionLabel: 'Pay invoice',
        metadata: { invoiceId: created.data.id, totalMinor: total },
      });
      return {
        url: razorpayInvoice.short_url!,
        sessionId: razorpayInvoice.id,
        invoiceId: created.data.id,
        paymentRequired: true,
        entitled: false,
      };
    } catch (error) {
      await this.billingClient
        .from('backend_billing_invoices')
        .update({
          status: 'failed',
          metadata: {
            provider_error:
              error instanceof Error ? error.message : 'Unknown provider error',
          },
        })
        .eq('id', created.data.id);
      throw error;
    }
  }
}
