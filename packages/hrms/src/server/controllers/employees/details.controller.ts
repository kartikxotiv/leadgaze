import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  type EmployeeRow,
  enrichEmployees,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from './controller.helpers';
import { getEmployeeId } from './utils';

const getEmployeeController = catchAsync(async ({ params, request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });
  const employeeId = getEmployeeId(params);

  await requireEmployeePermission({
    featureKey: 'view',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('employees')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', employeeId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    throw new ApiError(error.message, error.code === 'PGRST116' ? 404 : 400);
  }

  const [employee] = await enrichEmployees({
    employees: [data as EmployeeRow],
    supabaseAdmin,
    workspaceId,
  });

  return successDataResponse('Employee fetched successfully', employee);
});

export { getEmployeeController };
