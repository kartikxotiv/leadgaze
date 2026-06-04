import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import {
  getRequiredWorkspaceId,
  getRouteUserId,
} from '../../employees/controller.helpers';
import { getEmployeeForAccount, getRoleKeysForUser } from '../utils';

const contextController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  const roleKeys = await getRoleKeysForUser({
    accountId: userId!,
    organizationId: workspaceId,
  });
  const isAdmin =
    roleKeys.includes('admin') ||
    roleKeys.includes('manager') ||
    roleKeys.includes('hr');

  let employeeId: string | null = null;

  try {
    const employee = await getEmployeeForAccount({
      accountId: userId!,
      organizationId: workspaceId,
    });

    employeeId = employee.id;
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 404) {
      throw error;
    }
  }

  return successDataResponse('Attendance context fetched successfully', {
    employeeId,
    isAdmin,
    organizationId: workspaceId,
    roleKeys,
  });
});

export { contextController };
