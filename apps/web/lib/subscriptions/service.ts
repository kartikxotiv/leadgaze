import { SubscriptionCheckoutService } from './subscription-checkout-service';
import type { Client } from './subscription-service-base';

export class SubscriptionService extends SubscriptionCheckoutService {}

export function createSubscriptionService(client: Client) {
  return new SubscriptionService(client);
}
