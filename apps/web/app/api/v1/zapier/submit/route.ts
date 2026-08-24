import { NextRequest, NextResponse } from 'next/server';

import {
  handleZapierOptions,
  handleZapierSubmit,
} from '@kit/integration-zapier';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  EntitlementError,
  type EntitlementReservation,
  createServiceRoleEntitlementService,
} from '~/lib/entitlements';

const CREATE_ACTIONS = {
  create_lead: { featureKey: 'sales.leads', resourceType: 'lead' },
  create_contact: { featureKey: 'sales.contacts', resourceType: 'contact' },
  create_opportunity: {
    featureKey: 'sales.opportunities',
    resourceType: 'opportunity',
  },
} as const;

function entitlementFailure(error: EntitlementError) {
  const response = NextResponse.json(
    {
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      data: error.data,
    },
    { status: error.statusCode },
  );
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}

export async function OPTIONS() {
  return handleZapierOptions();
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerAdminClient();
  const apiKey = request.headers.get('X-Zapier-Api-Key');

  if (!apiKey) return handleZapierSubmit(request, apiKey, supabase);

  const { data: keyData } = await supabase
    .schema('core')
    .from('zapier_api_keys')
    .select('workspace_id')
    .eq('api_key', apiKey)
    .eq('status', 'active')
    .maybeSingle();
  if (!keyData) return handleZapierSubmit(request, apiKey, supabase);

  const body = await request
    .clone()
    .json()
    .catch(() => null);
  const action = body?.action as string | undefined;
  const entitlement = action
    ? CREATE_ACTIONS[action as keyof typeof CREATE_ACTIONS]
    : undefined;
  const service = createServiceRoleEntitlementService();
  let reservation: EntitlementReservation | null = null;

  try {
    await service.requireBooleanFeature(
      keyData.workspace_id,
      'sales',
      'sales.zapier',
    );
    if (entitlement) {
      reservation = await service.reserveUsage({
        workspaceId: keyData.workspace_id,
        moduleKey: 'sales',
        featureKey: entitlement.featureKey,
        resourceType: entitlement.resourceType,
      });
    }
  } catch (error) {
    if (error instanceof EntitlementError) return entitlementFailure(error);
    throw error;
  }

  const response = await handleZapierSubmit(request, apiKey, supabase);
  if (reservation) {
    const responseBody = await response
      .clone()
      .json()
      .catch(() => null);
    if (!response.ok || responseBody?.success === false) {
      await reservation.rollback();
    } else {
      await reservation.commit({ resourceId: responseBody?.data?.id ?? null });
    }
  }

  return response;
}
