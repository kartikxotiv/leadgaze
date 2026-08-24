import type { NextRequest } from 'next/server';

import {
  createServiceCloudResourceController,
  deleteServiceCloudResourceController,
} from '@kit/service-cloud';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

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
    if (!entitlement) return createServiceCloudResourceController(input);

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
