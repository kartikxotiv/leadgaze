import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  type BillingClient,
  type CreateBundleInvoiceInput,
  addBillingPeriod,
  minorUnits,
} from './backend-billing-types';
import { BackendSeatBillingService } from './backend-seat-billing-service';
import { SubscriptionApiError } from './errors';

export abstract class BackendBundleBillingService extends BackendSeatBillingService {
  async createBundleInvoice(input: CreateBundleInvoiceInput) {
    if (!Number.isInteger(input.seats) || input.seats < 1) {
      throw new SubscriptionApiError(
        'Seats must be a positive integer',
        400,
        'BAD_REQUEST',
      );
    }

    const context = await this.loadBundleContext(
      input.workspaceId,
      input.bundleKey,
    );
    const currentSubscriptions = await this.billingClient
      .from('workspace_module_subscriptions')
      .select('bundle_id, plan_id, plans(display_order)')
      .eq('workspace_id', input.workspaceId)
      .in(
        'module_id',
        context.modules.map((module: BillingClient) => module.id),
      )
      .eq('status', 'active');
    if (currentSubscriptions.error) throw currentSubscriptions.error;
    if (input.purpose !== 'bundle_renewal') {
      const currentRows = currentSubscriptions.data ?? [];
      if (
        currentRows.length === context.modules.length &&
        currentRows.every(
          (row: BillingClient) =>
            row.bundle_id === context.bundle.id &&
            row.plan_id === context.plan.id,
        )
      ) {
        throw new SubscriptionApiError(
          'This bundle is already active. Use the bundle seat-change option instead.',
          409,
          'CONFLICT',
        );
      }
      const highestCurrentOrder = Math.max(
        -1,
        ...currentRows.map((row: BillingClient) => {
          const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
          return Number(plan?.display_order ?? -1);
        }),
      );
      if (Number(context.plan.display_order) < highestCurrentOrder) {
        throw new SubscriptionApiError(
          'Bundle plan downgrades must be scheduled for the period end',
          409,
          'CONFLICT',
        );
      }
    }
    const entitlements = await Promise.all(
      context.modules.map((module: BillingClient) =>
        this.getActiveEntitlement(input.workspaceId, module.id),
      ),
    );
    const entitledCount = entitlements.filter(Boolean).length;

    if (entitledCount > 0 && entitledCount !== context.modules.length) {
      throw new SubscriptionApiError(
        'A paid bundle cannot mix a free entitled module with a paid module. Purchase only the module that is not entitled.',
        409,
        'CONFLICT',
      );
    }

    if (entitledCount === context.modules.length) {
      for (let index = 0; index < context.modules.length; index += 1) {
        const moduleRow = context.modules[index];
        this.assertEntitledSeatLimit(
          entitlements[index]?.granted_seats ?? null,
          input.seats,
        );
        await this.createPlanInvoice({
          workspaceId: input.workspaceId,
          moduleKey: moduleRow.product_key,
          planKey: context.plan.plan_key,
          billingCycle: input.billingCycle,
          seats: input.seats,
          purpose: 'initial_purchase',
          actor: input.actor,
          idempotencyKey: input.idempotencyKey
            ? `${input.idempotencyKey}:${moduleRow.product_key}`
            : undefined,
        });
      }
      const link = await this.billingClient
        .from('workspace_module_subscriptions')
        .update({ bundle_id: context.bundle.id })
        .eq('workspace_id', input.workspaceId)
        .in(
          'module_id',
          context.modules.map((module: BillingClient) => module.id),
        );
      if (link.error) throw link.error;
      return {
        url: this.subscriptionUrl(),
        sessionId: `entitlement-bundle:${input.workspaceId}:${context.bundle.id}`,
        invoiceId: null,
        paymentRequired: false,
        entitled: true,
      };
    }

    const priceMajor =
      input.billingCycle === 'yearly'
        ? context.bundle.annual_price
        : context.bundle.monthly_price;
    if (priceMajor === null || priceMajor === undefined) {
      throw new SubscriptionApiError(
        `No backend ${input.billingCycle} price is configured for this bundle`,
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }

    const periodStart = input.periodStart ?? new Date();
    const periodEnd = addBillingPeriod(periodStart, input.billingCycle);
    const currentSeats = Math.max(
      0,
      ...context.modules.map(
        (module: BillingClient) =>
          Number(context.seatByModuleId.get(module.id)?.seats_purchased) || 0,
      ),
    );
    return this.issueBundleInvoice({
      workspaceId: input.workspaceId,
      bundleId: context.bundle.id,
      bundleName: context.bundle.bundle_name,
      planId: context.plan.id,
      planName: context.plan.plan_name,
      billingCycle: input.billingCycle,
      seatsBefore: currentSeats,
      seatsAfter: input.seats,
      quantity: input.seats,
      unitAmountMinor: minorUnits(Number(priceMajor)),
      purpose: input.purpose,
      actor: input.actor,
      discountCode: input.discountCode,
      idempotencyKey:
        input.idempotencyKey ??
        `${input.purpose}:${input.workspaceId}:${context.bundle.id}:${randomUUID()}`,
      periodStart,
      periodEnd,
      dueAt: input.dueAt,
      returnUrl: input.returnUrl,
      currency: context.bundle.currency,
      workspace: context.workspace,
      modules: context.modules,
      seatByModuleId: context.seatByModuleId,
    });
  }

  async changeBundleSeats(input: {
    workspaceId: string;
    bundleKey: string;
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
    const context = await this.loadBundleContext(
      input.workspaceId,
      input.bundleKey,
    );
    const moduleIds = context.modules.map((module: BillingClient) => module.id);
    const subscriptions = await this.billingClient
      .from('workspace_module_subscriptions')
      .select('module_id, bundle_id, plan_id, status')
      .eq('workspace_id', input.workspaceId)
      .in('module_id', moduleIds)
      .eq('status', 'active');
    if (subscriptions.error) throw subscriptions.error;
    if (
      (subscriptions.data ?? []).length !== moduleIds.length ||
      subscriptions.data.some(
        (row: BillingClient) =>
          row.bundle_id !== context.bundle.id ||
          row.plan_id !== context.plan.id,
      )
    ) {
      throw new SubscriptionApiError(
        'This workspace does not have the selected active bundle',
        409,
        'CONFLICT',
      );
    }

    const seats = moduleIds.map((moduleId: string) =>
      context.seatByModuleId.get(moduleId),
    );
    if (seats.some((seat: BillingClient) => !seat)) {
      throw new SubscriptionApiError(
        'The bundle seat records are incomplete',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const currentQuantity = Number(seats[0].seats_purchased);
    if (
      seats.some(
        (seat: BillingClient) =>
          Number(seat.seats_purchased) !== currentQuantity,
      )
    ) {
      throw new SubscriptionApiError(
        'Bundle module seat counts are out of sync. Run reconciliation before changing seats.',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const activeUsers = await this.billingClient
      .from('workspace_module_users')
      .select('module_id, user_id')
      .eq('workspace_id', input.workspaceId)
      .in('module_id', moduleIds)
      .eq('status', 'active');
    if (activeUsers.error) throw activeUsers.error;
    const actualUsersByModule = new Map<string, number>();
    for (const assignment of activeUsers.data ?? []) {
      actualUsersByModule.set(
        assignment.module_id,
        (actualUsersByModule.get(assignment.module_id) ?? 0) + 1,
      );
    }
    const usedSeats = Math.max(
      ...seats.map((seat: BillingClient) => Number(seat.seats_used) || 0),
      ...moduleIds.map(
        (moduleId: string) => actualUsersByModule.get(moduleId) ?? 0,
      ),
    );
    if (input.newQuantity < usedSeats) {
      throw new SubscriptionApiError(
        `Cannot reduce bundle seats below ${usedSeats} currently assigned users`,
        409,
        'CONFLICT',
      );
    }
    if (input.newQuantity === currentQuantity) {
      return { changeStatus: 'applied' as const, unchanged: true };
    }

    const entitlements = await Promise.all(
      moduleIds.map((moduleId: string) =>
        this.getActiveEntitlement(input.workspaceId, moduleId),
      ),
    );
    const entitledCount = entitlements.filter(Boolean).length;
    if (entitledCount > 0 && entitledCount !== moduleIds.length) {
      throw new SubscriptionApiError(
        'Bundle seats cannot mix entitled and paid modules',
        409,
        'CONFLICT',
      );
    }
    if (entitledCount === moduleIds.length) {
      entitlements.forEach((entitlement) =>
        this.assertEntitledSeatLimit(
          entitlement?.granted_seats ?? null,
          input.newQuantity,
        ),
      );
      const update = await this.billingClient
        .from('workspace_module_seats')
        .update({
          seats_purchased: input.newQuantity,
          payment_provider: 'manual',
          updated_by: input.actor.id,
        })
        .eq('workspace_id', input.workspaceId)
        .in('product_id', moduleIds);
      if (update.error) throw update.error;
      return {
        changeStatus: 'applied' as const,
        paymentRequired: false,
        entitled: true,
      };
    }

    for (const moduleId of moduleIds) {
      await this.cancelOpenSeatChange(input.workspaceId, moduleId);
    }
    await this.cancelOpenBundleInvoices(input.workspaceId, context.bundle.id, [
      'bundle_seat_increase',
      'bundle_renewal',
    ]);

    const firstSeat = seats[0];
    const periodStart = firstSeat.current_period_start
      ? new Date(firstSeat.current_period_start)
      : new Date();
    const periodEnd = firstSeat.current_period_end
      ? new Date(firstSeat.current_period_end)
      : addBillingPeriod(periodStart, firstSeat.billing_cycle);

    if (input.newQuantity < currentQuantity) {
      const changeGroupId = randomUUID();
      const rows = seats.map((seat: BillingClient) => ({
        workspace_id: input.workspaceId,
        module_id: seat.product_id,
        seat_id: seat.id,
        change_group_id: changeGroupId,
        change_type: 'decrease',
        seats_before: currentQuantity,
        seats_after: input.newQuantity,
        status: 'scheduled',
        effective_at: periodEnd.toISOString(),
        created_by: input.actor.id,
        metadata: { bundle_id: context.bundle.id },
      }));
      const change = await this.billingClient
        .from('backend_seat_changes')
        .insert(rows)
        .select('id');
      if (change.error) throw change.error;
      await this.notifications.emitBestEffort({
        workspaceId: input.workspaceId,
        eventType: 'seat_decrease_scheduled',
        eventKey: `bundle_seat_decrease_scheduled:${changeGroupId}`,
        title: 'Bundle seat reduction scheduled',
        message: `Sales + Service seats will reduce from ${currentQuantity} to ${input.newQuantity} at the end of the current billing period.`,
        email: true,
      });
      return {
        changeStatus: 'pending' as const,
        paymentRequired: false,
        effectiveAt: periodEnd.toISOString(),
        changeGroupId,
      };
    }

    const priceMajor =
      firstSeat.billing_cycle === 'yearly'
        ? context.bundle.annual_price
        : context.bundle.monthly_price;
    if (priceMajor === null || priceMajor === undefined) {
      throw new SubscriptionApiError(
        'The backend bundle seat price is not configured',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const fullPeriodMs = Math.max(
      1,
      periodEnd.getTime() - periodStart.getTime(),
    );
    const remainingMs = Math.max(0, periodEnd.getTime() - Date.now());
    const proratedUnitAmount = Math.max(
      1,
      Math.round(minorUnits(Number(priceMajor)) * (remainingMs / fullPeriodMs)),
    );
    const invoice = await this.issueBundleInvoice({
      workspaceId: input.workspaceId,
      bundleId: context.bundle.id,
      bundleName: context.bundle.bundle_name,
      planId: context.plan.id,
      planName: context.plan.plan_name,
      billingCycle: firstSeat.billing_cycle,
      seatsBefore: currentQuantity,
      seatsAfter: input.newQuantity,
      quantity: input.newQuantity - currentQuantity,
      unitAmountMinor: proratedUnitAmount,
      purpose: 'bundle_seat_increase',
      actor: input.actor,
      discountCode: input.discountCode,
      idempotencyKey: `bundle_seat_increase:${input.workspaceId}:${context.bundle.id}:${input.newQuantity}:${randomUUID()}`,
      periodStart,
      periodEnd,
      currency: context.bundle.currency,
      workspace: context.workspace,
      modules: context.modules,
      seatByModuleId: context.seatByModuleId,
    });
    return { ...invoice, changeStatus: 'pending' as const };
  }
}
