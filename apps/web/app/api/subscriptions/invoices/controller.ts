import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionViewPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseInput,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { workspacePlansQuerySchema } from '~/lib/subscriptions/contracts';
import { catchAsync } from '~/utils/response-handler';

export const getBillingInvoices = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = parseInput(workspacePlansQuerySchema, {
      workspaceId: request.nextUrl.searchParams.get('workspaceId'),
    });
    await requireSubscriptionViewPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = getSupabaseServerAdminClient() as any;
    const result = await client
      .from('backend_billing_invoices')
      .select(
        'id, invoice_number, purpose, status, currency, total_amount_minor, seats_before, seats_after, due_at, paid_at, payment_url, created_at, subscription_products(display_name), plans(plan_name)',
      )
      .eq('workspace_id', input.workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (result.error) throw result.error;
    return success(result.data ?? []);
  },
);
