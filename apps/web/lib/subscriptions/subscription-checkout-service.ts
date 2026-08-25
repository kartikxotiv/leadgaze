import 'server-only';

import type { PricingCheckoutRequest } from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionModuleUserService } from './subscription-module-user-service';
import { asObject } from './subscription-service-base';

export class SubscriptionCheckoutService extends SubscriptionModuleUserService {
  async createCheckout(
    input: PricingCheckoutRequest,
    actor: { id: string; email?: string },
  ) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const current = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (current?.status === 'active') {
      const [currentPlan, targetPlan] = await Promise.all([
        Promise.resolve(asObject(current.plans)),
        this.repository.getPlan(input.planKey),
      ]);
      if (targetPlan.display_order <= Number(currentPlan.display_order)) {
        throw new SubscriptionApiError(
          'Checkout only accepts a paid upgrade. Use the scheduled downgrade or seat-change flow instead.',
          409,
          'CONFLICT',
        );
      }
    }
    return this.billing.createPlanInvoice({
      workspaceId: input.workspaceId,
      moduleKey: input.moduleKey,
      planKey: input.planKey,
      billingCycle: input.billingCycle,
      seats:
        input.seats ??
        (await this.getBillingQuantity(input.workspaceId, productModule.id)),
      purpose:
        current && current.status !== 'cancelled'
          ? 'plan_upgrade'
          : current
            ? 'module_add'
            : 'initial_purchase',
      actor,
      discountCode: input.discountCode,
      idempotencyKey: input.requestId
        ? `checkout:${input.workspaceId}:${input.requestId}`
        : undefined,
    });
  }
}
