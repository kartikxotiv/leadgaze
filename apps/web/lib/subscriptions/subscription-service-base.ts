import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@kit/supabase/database';

import {
  type SubscriptionNotificationEvent,
  SubscriptionNotificationService,
} from './notification-service';
import { SubscriptionRepository } from './repository';
import { StripeSubscriptionProvider } from './stripe-provider';

export type Client = SupabaseClient<Database>;
// Supabase relation cardinality is represented as either an object or an array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export const asObject = (value: unknown): AnyRow => {
  if (Array.isArray(value)) return (value[0] ?? {}) as AnyRow;
  return (value ?? {}) as AnyRow;
};

export const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export class SubscriptionServiceBase {
  readonly repository: SubscriptionRepository;
  protected readonly provider: StripeSubscriptionProvider;
  protected readonly notifications = new SubscriptionNotificationService();

  constructor(
    protected readonly client: Client,
    provider?: StripeSubscriptionProvider,
  ) {
    this.repository = new SubscriptionRepository(client);
    this.provider = provider ?? new StripeSubscriptionProvider();
  }

  protected async getBillingQuantity(workspaceId: string, moduleId: string) {
    const counts = await this.repository.getModuleUserCount(workspaceId, [
      moduleId,
    ]);
    return Math.max(1, counts.get(moduleId) ?? 0);
  }

  protected async cancelPendingChange(moduleSubscriptionId: string) {
    const result = await this.client
      .from('subscription_changes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('workspace_module_subscription_id', moduleSubscriptionId)
      .eq('status', 'pending');
    if (result.error) throw result.error;
  }

  protected async recordEvent(input: {
    workspaceId: string;
    eventType: SubscriptionNotificationEvent;
    eventKey: string;
    title: string;
    message: string;
    email: boolean;
    metadata?: Json;
  }) {
    await this.notifications.emitBestEffort({
      ...input,
      actionUrl: '/org/subscription',
    });
  }
}
