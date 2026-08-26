import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@kit/supabase/database';

import { BackendBillingService } from './backend-billing-service';
import {
  type SubscriptionNotificationEvent,
  SubscriptionNotificationService,
} from './notification-service';
import { SubscriptionRepository } from './repository';

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
  protected readonly billing: BackendBillingService;
  protected readonly notifications = new SubscriptionNotificationService();

  constructor(protected readonly client: Client) {
    this.repository = new SubscriptionRepository(client);
    this.billing = new BackendBillingService(client);
  }

  protected async getBillingQuantity(workspaceId: string, moduleId: string) {
    const [counts, seat] = await Promise.all([
      this.repository.getModuleUserCount(workspaceId, [moduleId]),
      this.client
        .from('workspace_module_seats')
        .select('seats_purchased')
        .eq('workspace_id', workspaceId)
        .eq('product_id', moduleId)
        .maybeSingle(),
    ]);
    if (seat.error) throw seat.error;
    return Math.max(
      1,
      counts.get(moduleId) ?? 0,
      seat.data?.seats_purchased ?? 0,
    );
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
