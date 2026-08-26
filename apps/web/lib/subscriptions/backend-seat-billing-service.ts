import 'server-only';

import { randomUUID } from 'node:crypto';

import { addBillingPeriod, minorUnits } from './backend-billing-types';
import { BackendBundleInvoiceService } from './backend-bundle-invoice-service';
import { SubscriptionApiError } from './errors';

export abstract class BackendSeatBillingService extends BackendBundleInvoiceService {
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
    const bundledSubscription = await this.billingClient
      .from('workspace_module_subscriptions')
      .select('bundle_id')
      .eq('workspace_id', seat.workspace_id)
      .eq('module_id', seat.product_id)
      .eq('status', 'active')
      .maybeSingle();
    if (bundledSubscription.error) throw bundledSubscription.error;
    if (bundledSubscription.data?.bundle_id) {
      throw new SubscriptionApiError(
        'This module belongs to a bundle. Change the shared bundle seat count instead.',
        409,
        'CONFLICT',
      );
    }
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
}
