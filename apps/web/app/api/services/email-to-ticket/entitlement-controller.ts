import type { NextRequest } from 'next/server';

import { convertCoreEmailToServiceCloudTicketController } from '@kit/service-cloud';

import {
  type EntitlementReservation,
  createEntitlementService,
} from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

export const convertEntitledEmailToTicket = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const body = await request
      .clone()
      .json()
      .catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    if (!workspaceId) {
      return convertCoreEmailToServiceCloudTicketController({ request });
    }

    const service = createEntitlementService();
    await service.requireBooleanFeature(
      workspaceId,
      'service_cloud',
      'service.email_to_ticket',
    );

    const reservations: EntitlementReservation[] = [];
    try {
      reservations.push(
        await service.reserveUsage({
          workspaceId,
          moduleKey: 'service_cloud',
          featureKey: 'service.tickets',
          resourceType: 'ticket',
        }),
      );

      if ((body?.customerMode ?? 'existing') === 'new') {
        reservations.push(
          await service.reserveUsage({
            workspaceId,
            moduleKey: 'service_cloud',
            featureKey: 'service.customers',
            resourceType: 'customer',
          }),
        );
      }
    } catch (error) {
      await Promise.all(
        reservations.map((reservation) => reservation.rollback()),
      );
      throw error;
    }

    const response = await convertCoreEmailToServiceCloudTicketController({
      request,
    });
    const responseBody = await response
      .clone()
      .json()
      .catch(() => null);

    if (!response.ok || responseBody?.data?.alreadyLinked) {
      await Promise.all(
        reservations.map((reservation) => reservation.rollback()),
      );
      return response;
    }

    await reservations[0]?.commit({
      resourceId: responseBody?.data?.ticket?.id ?? null,
    });
    await reservations[1]?.commit({
      resourceId: responseBody?.data?.customerId ?? null,
    });
    return response;
  },
);
