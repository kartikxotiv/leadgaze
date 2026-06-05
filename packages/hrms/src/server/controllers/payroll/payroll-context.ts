import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';

type AccessLevel = 'own' | 'team' | 'all';

async function getPayrollContext(params: {
  featureKey?: string;
  minAccessLevel?: AccessLevel;
  request: Request;
  user: unknown;
}): Promise<{
  hrms: any;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
}> {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(params.user);

  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const workspaceId = await getRequiredWorkspaceId({
    request: params.request as any,
    supabaseAdmin,
    userId,
  });

  await requireEmployeePermission({
    featureKey: params.featureKey ?? 'edit',
    minAccessLevel: params.minAccessLevel ?? 'team',
    moduleKey: 'hrms_payroll',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  return {
    hrms: getHrmsClient(supabaseAdmin),
    supabaseAdmin,
    userId,
    workspaceId,
  };
}

export { getPayrollContext };
