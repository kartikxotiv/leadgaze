/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  getEmployeeProfile,
  getSelfServiceContext,
  normalizeText,
} from './controller.shared';

const updateSelfServiceProfileController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getSelfServiceContext({ request, user });

    if (!context.canUpdateProfile) {
      throw new ApiError(
        'You do not have permission to update personal details',
        403,
      );
    }

    const profileBody = (body ?? {}) as Record<string, unknown>;
    const payload: Record<string, string | null> = {};

    if ('first_name' in profileBody) {
      const firstName = normalizeText(profileBody.first_name);

      if (!firstName) {
        throw new ApiError('First name is required', 400);
      }

      payload.first_name = firstName;
    }

    if ('last_name' in profileBody) {
      payload.last_name = normalizeText(profileBody.last_name);
    }

    if ('phone' in profileBody) {
      payload.phone = normalizeText(profileBody.phone);
    }

    if ('personal_email' in profileBody) {
      payload.personal_email = normalizeText(profileBody.personal_email);
    }

    if ('address' in profileBody) {
      payload.address = normalizeText(profileBody.address);
    }

    if ('emergency_contact_name' in profileBody) {
      payload.emergency_contact_name = normalizeText(
        profileBody.emergency_contact_name,
      );
    }

    if ('emergency_contact_phone' in profileBody) {
      payload.emergency_contact_phone = normalizeText(
        profileBody.emergency_contact_phone,
      );
    }

    const { error } = await context.hrms
      .from('employees')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq('workspace_id', context.workspaceId)
      .eq('id', context.employeeId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Personal details updated successfully',
      await getEmployeeProfile(context),
    );
  },
);

export { updateSelfServiceProfileController };
