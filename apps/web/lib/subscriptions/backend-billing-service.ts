import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { randomUUID } from 'node:crypto';

import type { Database } from '@kit/supabase/database';

import type { BillingCycle, PlanKey, SubscriptionModuleKey } from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionNotificationService } from './notification-service';
import { RazorpayInvoiceProvider } from './razorpay-provider';

type Client = SupabaseClient<Database>;
// The additive migration is intentionally usable before generated types are
// refreshed in a deployment pipeline.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BillingClient = any;

type InvoicePurpose =
  | 'initial_purchase'
  | 'plan_upgrade'
  | 'module_add'
  | 'seat_increase'
  | 'renewal';

type CreatePlanInvoiceInput = {
  workspaceId: string;
  moduleKey: SubscriptionModuleKey;
  planKey: PlanKey;
  billingCycle: BillingCycle;
  seats: number;
  purpose: Extract<
    InvoicePurpose,
    'initial_purchase' | 'plan_upgrade' | 'module_add' | 'renewal'
  >;
  actor: { id: string; email?: string };
  discountCode?: string;
  idempotencyKey?: string;
  periodStart?: Date;
  dueAt?: Date;
};

const DAY_MS = 86_400_000;

const addBillingPeriod = (from: Date, cycle: BillingCycle) => {
  const result = new Date(from);
  if (cycle === 'yearly') result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
};

const minorUnits = (amount: number) => Math.round(amount * 100);

export class BackendBillingService {
  private readonly billingClient: BillingClient;
  private readonly provider: RazorpayInvoiceProvider;
  private readonly notifications = new SubscriptionNotificationService();

  constructor(client: Client, provider = new RazorpayInvoiceProvider()) {
    this.billingClient = client;
    this.provider = provider;
  }

  async createPlanInvoice(input: CreatePlanInvoiceInput) {
    if (!Number.isInteger(input.seats) || input.seats < 1) {
      throw new SubscriptionApiError(
        'Seats must be a positive integer',
        400,
        'BAD_REQUEST',
      );
    }

    const context = await this.loadPlanContext(input);
    const entitlement = await this.getActiveEntitlement(
      input.workspaceId,
      context.module.id,
    );

    if (entitlement) {
      this.assertEntitledSeatLimit(entitlement.granted_seats, input.seats);
      await this.applyEntitledPlan({ ...input, ...context });
      return {
        url: this.subscriptionUrl(),
        sessionId: `entitlement:${input.workspaceId}:${context.module.id}`,
        invoiceId: null,
        paymentRequired: false,
        entitled: true,
      };
    }

    if (!context.plan.is_paid) {
      await this.applyFreePlan({ ...input, ...context });
      return {
        url: this.subscriptionUrl(),
        sessionId: `free:${input.workspaceId}:${context.module.id}`,
        invoiceId: null,
        paymentRequired: false,
        entitled: false,
      };
    }

    const priceMajor =
      input.billingCycle === 'yearly'
        ? context.price.annual_price
        : context.price.monthly_price;
    if (priceMajor === null || priceMajor === undefined) {
      throw new SubscriptionApiError(
        `No backend ${input.billingCycle} price is configured for this plan`,
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }

    const periodStart = input.periodStart ?? new Date();
    const periodEnd = addBillingPeriod(periodStart, input.billingCycle);
    const unitAmountMinor = minorUnits(Number(priceMajor));
    return this.issueInvoice({
      workspaceId: input.workspaceId,
      moduleId: context.module.id,
      moduleName: context.module.display_name,
      planId: context.plan.id,
      planName: context.plan.plan_name,
      billingCycle: input.billingCycle,
      seatsBefore: context.seat?.seats_purchased ?? 0,
      seatsAfter: input.seats,
      quantity: input.seats,
      unitAmountMinor,
      purpose: input.purpose,
      actor: input.actor,
      discountCode: input.discountCode,
      idempotencyKey:
        input.idempotencyKey ??
        `${input.purpose}:${input.workspaceId}:${context.module.id}:${randomUUID()}`,
      periodStart,
      periodEnd,
      dueAt: input.dueAt,
      currency: context.price.currency,
      workspace: context.workspace,
    });
  }

  async changeSeats(input: {
    seatId: string;
    newQuantity: number;
    actor: { id: string; email?: string };
    discountCode?: string;
  }) {
    if (!Number.isInteger(input.newQuantity) || input.newQuantity < 1) {
      throw new SubscriptionApiError(
        'newQuantity must be a positive integer',
        400,
        'BAD_REQUEST',
      );
    }
    const seatResult = await this.billingClient
      .from('workspace_module_seats')
      .select(
        '*, subscription_products(id, product_key, display_name, currency), workspaces(name, owner_id)',
      )
      .eq('id', input.seatId)
      .single();
    if (seatResult.error || !seatResult.data) {
      throw new SubscriptionApiError(
        'Seat subscription not found',
        404,
        'NOT_FOUND',
      );
    }
    const seat = seatResult.data;
    const moduleUsers = await this.billingClient
      .from('workspace_module_users')
      .select('user_id')
      .eq('workspace_id', seat.workspace_id)
      .eq('module_id', seat.product_id)
      .eq('status', 'active');
    if (moduleUsers.error) throw moduleUsers.error;
    const usedSeats = Math.max(
      Number(seat.seats_used),
      (moduleUsers.data ?? []).length,
    );
    if (input.newQuantity < usedSeats) {
      throw new SubscriptionApiError(
        `Cannot reduce seats below ${usedSeats} currently assigned users`,
        409,
        'CONFLICT',
      );
    }
    if (input.newQuantity === Number(seat.seats_purchased)) {
      return { changeStatus: 'applied' as const, unchanged: true };
    }

    const entitlement = await this.getActiveEntitlement(
      seat.workspace_id,
      seat.product_id,
    );
    if (entitlement) {
      this.assertEntitledSeatLimit(
        entitlement.granted_seats,
        input.newQuantity,
      );
      const update = await this.billingClient
        .from('workspace_module_seats')
        .update({
          seats_purchased: input.newQuantity,
          payment_provider: 'manual',
          provider_customer_id: null,
          provider_subscription_id: null,
          provider_metadata: {
            entitlement_id: entitlement.id,
            billing_bypassed: true,
          },
          updated_by: input.actor.id,
        })
        .eq('id', seat.id);
      if (update.error) throw update.error;
      return {
        changeStatus: 'applied' as const,
        paymentRequired: false,
        entitled: true,
      };
    }

    if (input.newQuantity < Number(seat.seats_purchased)) {
      const effectiveAt =
        seat.current_period_end ??
        addBillingPeriod(new Date(), seat.billing_cycle);
      await this.cancelOpenSeatChange(seat.workspace_id, seat.product_id);
      await this.cancelOpenInvoices(seat.workspace_id, seat.product_id, [
        'renewal',
      ]);
      const change = await this.billingClient
        .from('backend_seat_changes')
        .insert({
          workspace_id: seat.workspace_id,
          module_id: seat.product_id,
          seat_id: seat.id,
          change_type: 'decrease',
          seats_before: seat.seats_purchased,
          seats_after: input.newQuantity,
          status: 'scheduled',
          effective_at: new Date(effectiveAt).toISOString(),
          created_by: input.actor.id,
        })
        .select('id')
        .single();
      if (change.error) throw change.error;
      await this.notifications.emitBestEffort({
        workspaceId: seat.workspace_id,
        eventType: 'seat_decrease_scheduled',
        eventKey: `seat_decrease_scheduled:${change.data.id}`,
        title: 'Seat reduction scheduled',
        message: `Seats will reduce from ${seat.seats_purchased} to ${input.newQuantity} at the end of the current billing period.`,
        email: true,
      });
      return {
        changeStatus: 'pending' as const,
        paymentRequired: false,
        effectiveAt: new Date(effectiveAt).toISOString(),
        changeId: change.data.id,
      };
    }

    const planResult = await this.billingClient
      .from('workspace_module_subscriptions')
      .select('plan_id, plans(plan_name)')
      .eq('workspace_id', seat.workspace_id)
      .eq('module_id', seat.product_id)
      .maybeSingle();
    if (planResult.error || !planResult.data) {
      throw new SubscriptionApiError(
        'The paid plan price for this module is not configured',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const priceResult = await this.billingClient
      .from('module_plan_prices')
      .select('*')
      .eq('module_id', seat.product_id)
      .eq('plan_id', planResult.data.plan_id)
      .eq('is_active', true)
      .maybeSingle();
    if (priceResult.error) throw priceResult.error;
    const price = priceResult.data;
    const priceMajor =
      seat.billing_cycle === 'yearly'
        ? price?.annual_price
        : price?.monthly_price;
    if (priceMajor === null || priceMajor === undefined) {
      throw new SubscriptionApiError(
        'The backend seat price is not configured',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }

    await this.cancelOpenSeatChange(seat.workspace_id, seat.product_id);
    const periodStart = seat.current_period_start
      ? new Date(seat.current_period_start)
      : new Date();
    const periodEnd = seat.current_period_end
      ? new Date(seat.current_period_end)
      : addBillingPeriod(periodStart, seat.billing_cycle);
    const fullPeriodMs = Math.max(
      1,
      periodEnd.getTime() - periodStart.getTime(),
    );
    const remainingMs = Math.max(0, periodEnd.getTime() - Date.now());
    const proratedUnitAmount = Math.max(
      1,
      Math.round(minorUnits(Number(priceMajor)) * (remainingMs / fullPeriodMs)),
    );
    const invoice = await this.issueInvoice({
      workspaceId: seat.workspace_id,
      moduleId: seat.product_id,
      moduleName: seat.subscription_products.display_name,
      planId: planResult.data.plan_id,
      planName: Array.isArray(planResult.data.plans)
        ? planResult.data.plans[0]?.plan_name
        : planResult.data.plans?.plan_name,
      billingCycle: seat.billing_cycle,
      seatsBefore: seat.seats_purchased,
      seatsAfter: input.newQuantity,
      quantity: input.newQuantity - seat.seats_purchased,
      unitAmountMinor: proratedUnitAmount,
      purpose: 'seat_increase',
      actor: input.actor,
      discountCode: input.discountCode,
      idempotencyKey: `seat_increase:${seat.id}:${input.newQuantity}:${randomUUID()}`,
      periodStart,
      periodEnd,
      currency: price.currency,
      workspace: seat.workspaces,
      seatId: seat.id,
    });
    return { ...invoice, changeStatus: 'pending' as const };
  }

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
      .select('id, workspace_id, invoice_number, status');
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
    const result = await this.billingClient.rpc('apply_paid_backend_invoice', {
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

  private async issueInvoice(input: {
    workspaceId: string;
    moduleId: string;
    moduleName: string;
    planId: string;
    planName?: string;
    billingCycle: BillingCycle;
    seatsBefore: number;
    seatsAfter: number;
    quantity: number;
    unitAmountMinor: number;
    purpose: InvoicePurpose;
    actor: { id: string; email?: string };
    discountCode?: string;
    idempotencyKey: string;
    periodStart: Date;
    periodEnd: Date;
    dueAt?: Date;
    currency: string;
    workspace: { name?: string | null; owner_id?: string };
    seatId?: string;
  }) {
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
      input.dueAt ?? new Date(now.getTime() + this.invoiceDueDays() * DAY_MS);
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
        quantity: 1,
        expireBy: dueAt,
        notes: {
          backend_invoice_id: created.data.id,
          workspace_id: input.workspaceId,
          module_id: input.moduleId,
          purpose: input.purpose,
        },
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

  private async loadPlanContext(input: CreatePlanInvoiceInput) {
    const [workspace, module, plan, subscription] = await Promise.all([
      this.billingClient
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', input.workspaceId)
        .single(),
      this.billingClient
        .from('subscription_products')
        .select('id, product_key, display_name')
        .eq('product_key', input.moduleKey)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('plans')
        .select('*')
        .eq('plan_key', input.planKey)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('workspace_subscriptions')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .maybeSingle(),
    ]);
    if (workspace.error || !workspace.data) throw workspace.error;
    if (module.error || !module.data)
      throw new SubscriptionApiError('Module not found', 404, 'NOT_FOUND');
    if (plan.error || !plan.data)
      throw new SubscriptionApiError('Plan not found', 404, 'NOT_FOUND');
    if (subscription.error) throw subscription.error;
    if (!subscription.data) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const [price, seat] = await Promise.all([
      this.billingClient
        .from('module_plan_prices')
        .select('*')
        .eq('module_id', module.data.id)
        .eq('plan_id', plan.data.id)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('workspace_module_seats')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .eq('product_id', module.data.id)
        .maybeSingle(),
    ]);
    if (price.error || !price.data)
      throw new SubscriptionApiError(
        'No active backend price is configured for this module and plan',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    if (seat.error) throw seat.error;
    return {
      workspace: workspace.data,
      module: module.data,
      plan: plan.data,
      subscription: subscription.data,
      price: price.data,
      seat: seat.data,
    };
  }

  private async getActiveEntitlement(workspaceId: string, moduleId: string) {
    const now = new Date().toISOString();
    const result = await this.billingClient
      .from('module_entitlements')
      .select('id, granted_seats, valid_until')
      .eq('workspace_id', workspaceId)
      .eq('product_id', moduleId)
      .eq('is_active', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gt.${now}`)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }

  private assertEntitledSeatLimit(
    grantedSeats: number | null,
    requestedSeats: number,
  ) {
    if (grantedSeats !== null && requestedSeats > grantedSeats) {
      throw new SubscriptionApiError(
        `This free entitlement allows at most ${grantedSeats} seats`,
        409,
        'FEATURE_LIMIT_EXCEEDED',
      );
    }
  }

  private async applyEntitledPlan(
    input: CreatePlanInvoiceInput &
      Awaited<ReturnType<BackendBillingService['loadPlanContext']>>,
  ) {
    await this.applyPlanWithoutPayment(input, true);
  }

  private async applyFreePlan(
    input: CreatePlanInvoiceInput &
      Awaited<ReturnType<BackendBillingService['loadPlanContext']>>,
  ) {
    await this.applyPlanWithoutPayment(input, false);
  }

  private async applyPlanWithoutPayment(
    input: CreatePlanInvoiceInput &
      Awaited<ReturnType<BackendBillingService['loadPlanContext']>>,
    entitled: boolean,
  ) {
    const now = new Date().toISOString();
    const moduleSubscription = await this.billingClient
      .from('workspace_module_subscriptions')
      .upsert(
        {
          workspace_subscription_id: input.subscription.id,
          workspace_id: input.workspaceId,
          module_id: input.module.id,
          plan_id: input.plan.id,
          status: 'active',
          monthly_amount: entitled ? 0 : input.price.monthly_price,
          annual_amount: entitled ? 0 : input.price.annual_price,
          started_at: now,
          cancelled_at: null,
        },
        { onConflict: 'workspace_id,module_id' },
      );
    if (moduleSubscription.error) throw moduleSubscription.error;
    const seat = await this.billingClient.from('workspace_module_seats').upsert(
      {
        workspace_id: input.workspaceId,
        product_id: input.module.id,
        seats_purchased: input.seats,
        status: 'active',
        billing_cycle: input.billingCycle,
        current_period_start: null,
        current_period_end: null,
        trial_ends_at: null,
        payment_provider: 'manual',
        provider_customer_id: null,
        provider_subscription_id: null,
        provider_metadata: {
          billing_bypassed: true,
          reason: entitled ? 'active_entitlement' : 'free_plan',
        },
        created_by: input.actor.id,
        updated_by: input.actor.id,
      },
      { onConflict: 'workspace_id,product_id' },
    );
    if (seat.error) throw seat.error;
  }

  private async resolveDiscount(input: {
    workspaceId: string;
    moduleId: string;
    planId: string;
    discountCode?: string;
    currency: string;
  }) {
    const now = new Date().toISOString();
    const query = this.billingClient
      .from('workspace_billing_discounts')
      .select('*, billing_discounts(*)')
      .eq('workspace_id', input.workspaceId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`);
    const assignments = await query;
    if (assignments.error) throw assignments.error;
    const candidates = (assignments.data ?? [])
      .filter(
        (row: BillingClient) =>
          (!row.module_id || row.module_id === input.moduleId) &&
          (!row.plan_id || row.plan_id === input.planId) &&
          (row.maximum_uses === null || row.use_count < row.maximum_uses),
      )
      .map((row: BillingClient) => {
        const discount = Array.isArray(row.billing_discounts)
          ? row.billing_discounts[0]
          : row.billing_discounts;
        return discount ? { ...discount, workspace_discount_id: row.id } : null;
      })
      .filter(
        (discount: BillingClient) =>
          discount?.is_active &&
          (!input.discountCode ||
            discount.discount_code === input.discountCode) &&
          (!discount.currency || discount.currency === input.currency) &&
          (!discount.maximum_redemptions ||
            discount.redemption_count < discount.maximum_redemptions) &&
          (!discount.starts_at || discount.starts_at <= now) &&
          (!discount.ends_at || discount.ends_at > now),
      );
    if (input.discountCode && candidates.length === 0) {
      throw new SubscriptionApiError(
        'The discount code is not valid for this workspace, module, or plan',
        409,
        'CONFLICT',
      );
    }
    return candidates[0] ?? null;
  }

  private async cancelOpenSeatChange(workspaceId: string, moduleId: string) {
    const open = await this.billingClient
      .from('backend_seat_changes')
      .select(
        'id, invoice_id, backend_billing_invoices(razorpay_invoice_id, status)',
      )
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('status', ['awaiting_payment', 'scheduled']);
    if (open.error) throw open.error;
    const invoiceIds: string[] = [];
    for (const change of open.data ?? []) {
      if (!change.invoice_id) continue;
      invoiceIds.push(change.invoice_id);
      const invoice = Array.isArray(change.backend_billing_invoices)
        ? change.backend_billing_invoices[0]
        : change.backend_billing_invoices;
      if (invoice?.status === 'issued' && invoice.razorpay_invoice_id) {
        await this.provider.cancelInvoice(invoice.razorpay_invoice_id);
      }
    }
    const result = await this.billingClient
      .from('backend_seat_changes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('status', ['awaiting_payment', 'scheduled']);
    if (result.error) throw result.error;
    if (invoiceIds.length) {
      const invoices = await this.billingClient
        .from('backend_billing_invoices')
        .update({ status: 'cancelled' })
        .in('id', invoiceIds)
        .in('status', ['draft', 'issued', 'failed']);
      if (invoices.error) throw invoices.error;
    }
  }

  async cancelOpenInvoices(
    workspaceId: string,
    moduleId: string,
    purposes: InvoicePurpose[],
  ) {
    const open = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, status, razorpay_invoice_id')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('purpose', purposes)
      .in('status', ['draft', 'issued']);
    if (open.error) throw open.error;
    for (const invoice of open.data ?? []) {
      if (invoice.status === 'issued' && invoice.razorpay_invoice_id) {
        await this.provider.cancelInvoice(invoice.razorpay_invoice_id);
      }
    }
    const ids = (open.data ?? []).map((invoice: { id: string }) => invoice.id);
    if (ids.length) {
      const update = await this.billingClient
        .from('backend_billing_invoices')
        .update({ status: 'cancelled' })
        .in('id', ids)
        .in('status', ['draft', 'issued']);
      if (update.error) throw update.error;
    }
  }

  private async getOwnerEmail(workspaceId: string) {
    const result = await this.billingClient
      .from('workspaces')
      .select('accounts!workspaces_owner_id_fkey(email)')
      .eq('id', workspaceId)
      .single();
    if (result.error) throw result.error;
    const account = Array.isArray(result.data.accounts)
      ? result.data.accounts[0]
      : result.data.accounts;
    if (!account?.email) {
      throw new SubscriptionApiError(
        'The billing owner does not have an email address',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    return account.email;
  }

  private invoiceDueDays() {
    const configured = Number(process.env.BILLING_INVOICE_DUE_DAYS ?? 7);
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : 7;
  }

  private subscriptionUrl() {
    return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/org/subscription`;
  }
}
