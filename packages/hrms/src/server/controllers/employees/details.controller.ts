import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  attachEmployeeManagers,
  employeeSelect,
  formatEmployeesWithRoleId,
  getRequiredOrganizationId,
} from './controller.helpers';
import { getEmployeeId } from './utils';

const getEmployeeController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const employeeId = getEmployeeId(params);

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(employeeSelect)
    .eq('organization_id', organizationId)
    .eq('id', employeeId)
    .single();

  if (error) {
    throw new ApiError(error.message, error.code === 'PGRST116' ? 404 : 400);
  }

  const [employee] = await attachEmployeeManagers({
    employees: formatEmployeesWithRoleId([data]),
    organizationId,
    supabaseAdmin,
  });

  return successDataResponse('Employee fetched successfully', employee);
});

export { getEmployeeController };
