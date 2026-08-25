import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  type CreatePlanInvoiceInput,
  addBillingPeriod,
  minorUnits,
} from './backend-billing-types';
import { BackendBundleBillingService } from './backend-bundle-billing-service';
import { SubscriptionApiError } from './errors';

/** Public billing facade. Implementation is split by billing responsibility. */
export class BackendBillingService extends BackendBundleBillingService {
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
      returnUrl: input.returnUrl,
      currency: context.price.currency,
      workspace: context.workspace,
    });
  }
}
