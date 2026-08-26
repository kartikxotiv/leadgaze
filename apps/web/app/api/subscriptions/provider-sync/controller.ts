import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { BackendBillingService } from '~/lib/subscriptions/backend-billing-service';
import { providerSyncRequestSchema } from '~/lib/subscriptions/contracts';
import { RazorpayInvoiceProvider } from '~/lib/subscriptions/razorpay-provider';
import { catchAsync } from '~/utils/response-handler';

export const synchronizeProvider = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, providerSyncRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = getSupabaseServerAdminClient() as any;
    const invoices = await client
      .from('backend_billing_invoices')
      .select('id, razorpay_invoice_id')
      .eq('workspace_id', input.workspaceId)
      .eq('status', 'issued')
      .not('razorpay_invoice_id', 'is', null)
      .limit(100);
    if (invoices.error) throw invoices.error;

    const provider = new RazorpayInvoiceProvider();
    const billing = new BackendBillingService(client, provider);
    let synchronized = 0;
    let failed = 0;
    for (const invoice of invoices.data ?? []) {
      try {
        const remote = await provider.fetchInvoice(invoice.razorpay_invoice_id);
        if (remote.status === 'paid') {
          await billing.markInvoicePaid({
            razorpayInvoiceId: invoice.razorpay_invoice_id,
          });
        } else if (['expired', 'cancelled'].includes(remote.status)) {
          await client
            .from('backend_billing_invoices')
            .update({ status: remote.status })
            .eq('id', invoice.id)
            .eq('status', 'issued');
        }
        synchronized += 1;
      } catch (error) {
        failed += 1;
        console.error('[RazorpaySync] invoice sync failed', {
          invoiceId: invoice.id,
          error,
        });
      }
    }
    return success({
      workspaceId: input.workspaceId,
      provider: 'razorpay' as const,
      synchronized,
      failed,
      synchronizedAt: new Date().toISOString(),
    });
  },
);
