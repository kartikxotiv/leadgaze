import { NextRequest } from 'next/server';

import {
  handleFormSubmit,
  handleSubmitOptions,
  processWebsiteSubmission,
} from '@kit/integration-website';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { createServiceRoleEntitlementService } from '~/lib/entitlements';

type WebsiteSubmissionClient = Parameters<typeof processWebsiteSubmission>[0];
type WebsiteSubmissionInput = Parameters<typeof processWebsiteSubmission>[1];

export async function OPTIONS() {
  return handleSubmitOptions();
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerAdminClient();
  const publicKey = request.headers.get('X-Connector-Public-Key');

  return handleFormSubmit(
    request,
    publicKey,
    async (client: WebsiteSubmissionClient, input: WebsiteSubmissionInput) => {
      const isSales = input.connector.destination_module === 'crm';
      const service = createServiceRoleEntitlementService();
      const reservation = await service.reserveUsage({
        workspaceId: input.workspace_id,
        moduleKey: isSales ? 'sales' : 'service_cloud',
        featureKey: isSales ? 'sales.leads' : 'service.tickets',
        resourceType: isSales ? 'lead' : 'ticket',
      });

      try {
        const result = await processWebsiteSubmission(client, input);
        if (result.status === 'success') {
          await reservation.commit({ resourceId: result.entity_id });
        } else {
          await reservation.rollback();
        }
        return result;
      } catch (error) {
        await reservation.rollback();
        throw error;
      }
    },
    supabase,
  );
}
