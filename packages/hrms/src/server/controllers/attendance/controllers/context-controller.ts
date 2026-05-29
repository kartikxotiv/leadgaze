import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  getEmployeeForAccount,
  getRoleKeysForUser,
} from '../utils';

const contextController = catchAsync(async ({ user }) => {
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const roleKeys = await getRoleKeysForUser({
    accountId: user!.id,
    organizationId,
  });
  const isAdmin = roleKeys.includes('admin') || roleKeys.includes('hr_manager');

  let employeeId: string | null = null;

  try {
    const employee = await getEmployeeForAccount({
      accountId: user!.id,
      organizationId,
    });

    employeeId = employee.id;
  } catch {
    employeeId = null;
  }

  return successDataResponse('Attendance context fetched successfully', {
    employeeId,
    isAdmin,
    organizationId,
    roleKeys,
  });
});

export { contextController };
