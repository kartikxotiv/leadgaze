import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { providerSyncRequestSchema } from '~/lib/subscriptions/contracts';
import { SubscriptionApiError } from '~/lib/subscriptions/errors';
import { SubscriptionRepository } from '~/lib/subscriptions/repository';
import { StripeSubscriptionProvider } from '~/lib/subscriptions/stripe-provider';
import { synchronizeStripeSubscription } from '~/lib/subscriptions/stripe-sync';
import { catchAsync } from '~/utils/response-handler';

export const synchronizeProvider = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, providerSyncRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const client = getSupabaseServerAdminClient();
    const billing = await new SubscriptionRepository(
      client,
    ).getBillingSubscription(input.workspaceId);
    let providerSubscriptionId = billing?.provider_subscription_id;
    if (!billing) {
      const legacy = await client
        .from('workspace_module_seats')
        .select('provider_subscription_id, provider_customer_id')
        .eq('workspace_id', input.workspaceId)
        .not('provider_subscription_id', 'is', null)
        .neq('status', 'cancelled')
        .limit(1)
        .maybeSingle();
      if (legacy.error) throw legacy.error;
      if (!legacy.data?.provider_subscription_id) {
        throw new SubscriptionApiError(
          'Stripe subscription not found',
          404,
          'NOT_FOUND',
        );
      }
      const workspaceSubscription = await client
        .from('workspace_subscriptions')
        .select('id')
        .eq('workspace_id', input.workspaceId)
        .single();
      if (workspaceSubscription.error) throw workspaceSubscription.error;
      const account = await client
        .from('workspace_billing_accounts')
        .upsert(
          {
            workspace_id: input.workspaceId,
            provider: 'stripe',
            provider_customer_id: legacy.data.provider_customer_id,
            is_active: true,
          },
          { onConflict: 'workspace_id,provider' },
        )
        .select('id')
        .single();
      if (account.error) throw account.error;
      const inserted = await client
        .from('workspace_billing_subscriptions')
        .upsert(
          {
            workspace_id: input.workspaceId,
            workspace_subscription_id: workspaceSubscription.data.id,
            billing_account_id: account.data.id,
            provider_subscription_id: legacy.data.provider_subscription_id,
            provider_status: 'syncing',
            metadata: { migrated_from_legacy_seats: true, items: {} },
          },
          { onConflict: 'billing_account_id,provider_subscription_id' },
        )
        .select('*')
        .single();
      if (inserted.error) throw inserted.error;
      providerSubscriptionId = inserted.data.provider_subscription_id;
    }
    if (!providerSubscriptionId) {
      throw new SubscriptionApiError(
        'Stripe subscription not found',
        404,
        'NOT_FOUND',
      );
    }
    const subscription =
      await new StripeSubscriptionProvider().retrieveSubscription(
        providerSubscriptionId,
      );
    return success(
      await synchronizeStripeSubscription({ client, subscription }),
    );
  },
);
