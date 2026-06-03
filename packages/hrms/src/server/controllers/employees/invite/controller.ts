import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../controller.helpers';
import { createEmployeeController } from '../mutations.controller';

const getEmployeeInvitedController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireEmployeePermission({
    featureKey: 'view',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('invited_employees')
    .select('employee:employees(work_email), status, invited_email, invited_at')
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Invited employees fetched successfully', {
    invitedEmployees: data ?? [],
  });
});

const sendInviteController = createEmployeeController;

export { sendInviteController, getEmployeeInvitedController };
