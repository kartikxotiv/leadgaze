import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { getRbacSnapshot } from '~/lib/server/rbac';
import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

const getMyRbacController = catchAsync(async ({ user }) => {
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const snapshot = await getRbacSnapshot({
    accountId: user!.id,
    organizationId,
  });

  return successDataResponse('RBAC snapshot fetched successfully', {
    organizationId,
    employeeId: snapshot.employeeId,
    roleKeys: snapshot.roleKeys,
    allowedModules: snapshot.allowedModules,
    permissions: snapshot.permissions,
  });
});

export { getMyRbacController };

