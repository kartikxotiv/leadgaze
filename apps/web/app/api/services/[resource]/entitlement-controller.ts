import type { NextRequest } from 'next/server';

import {
  createServiceCloudResourceController,
  deleteServiceCloudResourceController,
} from '@kit/service-cloud';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE from '~/constants/email.templates/assignment-notification.template';
import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';
import { transporter } from '~/utils/send-mail';

const RESOURCE_ENTITLEMENTS = {
  tickets: { featureKey: 'service.tickets', resourceType: 'ticket' },
  customers: { featureKey: 'service.customers', resourceType: 'customer' },
} as const;

type ControllerInput = {
  request: NextRequest;
  params?: Record<string, string>;
};

export const createEntitledServiceCloudResource = catchAsync(
  async (input: ControllerInput) => {
    const resource = input.params?.resource ?? '';
    const meteredResource = resource as keyof typeof RESOURCE_ENTITLEMENTS;
    const entitlement = RESOURCE_ENTITLEMENTS[meteredResource];

    if (!entitlement) {
      const response = await createServiceCloudResourceController(input);

      if (response.ok && resource === 'ticket-assignees') {
        const responseBody = await response
          .clone()
          .json()
          .catch(() => null);
        const data = responseBody?.data;

        if (data?.ticket_id && (data?.account_id || data?.user_id)) {
          void (async () => {
            try {
              const recipientUserId = data.account_id || data.user_id;
              const admin = getSupabaseServerAdminClient();

              const { data: recipientAccount } = await admin
                .from('accounts')
                .select('email, name')
                .eq('id', recipientUserId)
                .maybeSingle();

              const recipientEmail = recipientAccount?.email;
              if (!recipientEmail) return;

              const supabaseClient = getSupabaseServerClient();
              const { data: authData } = await supabaseClient.auth.getUser();
              const currentUserId = authData?.user?.id;
              let assignerName = 'A team member';

              if (currentUserId) {
                const { data: assignerAccount } = await admin
                  .from('accounts')
                  .select('name')
                  .eq('id', currentUserId)
                  .maybeSingle();

                if (assignerAccount?.name) {
                  assignerName = assignerAccount.name;
                }
              }

              const { data: ticket } = await (admin as any)
                .schema('service_cloud')
                .from('tickets')
                .select(
                  `
                  id,
                  ticket_number,
                  subject,
                  workspace_id,
                  status:ticket_statuses(name),
                  priority:ticket_priorities(name)
                `,
                )
                .eq('id', data.ticket_id)
                .maybeSingle();

              if (!ticket) return;

              const appBaseUrl =
                process.env.NEXT_PUBLIC_SITE_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                'http://localhost:3000';
              const ticketUrl = `${appBaseUrl}/home/services/tickets/${data.ticket_id}`;
              const ticketSubject = ticket.subject || 'Ticket';
              const ticketNumber = ticket.ticket_number
                ? `#${ticket.ticket_number}`
                : ticket.id;
              const statusName = ticket.status?.name || 'Open';
              const priorityName = ticket.priority?.name || 'Normal';

              const emailHtml = ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE({
                entityType: 'Ticket',
                entityName: ticketSubject,
                assignerName,
                entityUrl: ticketUrl,
                details: [
                  { label: 'Ticket ID', value: ticketNumber },
                  { label: 'Status', value: statusName },
                  { label: 'Priority', value: priorityName },
                ],
                buttonLabel: 'View Ticket',
                productName: 'Service Desk',
                appUrl: appBaseUrl,
              });

              await transporter.sendMail({
                from:
                  process.env.SMTP_FROM ||
                  process.env.SMTP_USER ||
                  'noreply@leadgaze.com',
                to: recipientEmail,
                subject: `You have been assigned to ticket: ${ticketSubject}`,
                html: emailHtml,
              });

              console.log(
                '[TicketAssigneeNotification] Non-blocking email sent successfully to:',
                recipientEmail,
              );
            } catch (notificationError) {
              console.error(
                '[TicketAssigneeNotification] Non-blocking email dispatch error:',
                notificationError,
              );
            }
          })();
        }
      }

      return response;
    }

    const body = await input.request
      .clone()
      .json()
      .catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    if (!workspaceId) return createServiceCloudResourceController(input);

    const service = createEntitlementService();
    const reservation = await service.reserveUsage({
      workspaceId,
      moduleKey: 'service_cloud',
      featureKey: entitlement.featureKey,
      resourceType: entitlement.resourceType,
    });

    const response = await createServiceCloudResourceController(input);
    if (!response.ok) {
      await reservation.rollback();
      return response;
    }

    const responseBody = await response
      .clone()
      .json()
      .catch(() => null);
    await reservation.commit({ resourceId: responseBody?.data?.id ?? null });
    return response;
  },
);

export const deleteEntitledServiceCloudResource = catchAsync(
  async (input: ControllerInput) => {
    const resource = input.params?.resource ?? '';
    const meteredResource = resource as keyof typeof RESOURCE_ENTITLEMENTS;
    const entitlement = RESOURCE_ENTITLEMENTS[meteredResource];
    if (!entitlement) return deleteServiceCloudResourceController(input);

    const url = new URL(input.request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    const id = url.searchParams.get('id');
    if (!workspaceId || !id) return deleteServiceCloudResourceController(input);

    const admin = getSupabaseServerAdminClient();
    const { data: activeRecord, error } = await admin
      .schema('service_cloud')
      .from(meteredResource)
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw error;

    const response = await deleteServiceCloudResourceController(input);
    if (response.ok && activeRecord) {
      await createEntitlementService().releaseUsage({
        workspaceId,
        moduleKey: 'service_cloud',
        featureKey: entitlement.featureKey,
        resourceId: id,
        resourceType: entitlement.resourceType,
      });
    }
    return response;
  },
);
