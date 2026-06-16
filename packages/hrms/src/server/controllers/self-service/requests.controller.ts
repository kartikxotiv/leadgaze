/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import { getSelfServiceContext, normalizeText } from './controller.shared';

const createSelfServiceRequestController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getSelfServiceContext({ request, user });

    if (!context.canCreateRequest) {
      throw new ApiError(
        'You do not have permission to raise HR requests',
        403,
      );
    }

    const requestBody = body as Record<string, unknown>;

    const { data, error } = await context.hrms
      .from('hr_requests')
      .insert({
        category: requestBody.category,
        created_by: context.userId,
        description: normalizeText(requestBody.description),
        employee_id: context.employeeId,
        priority: requestBody.priority,
        subject: normalizeText(requestBody.subject),
        updated_by: context.userId,
        workspace_id: context.workspaceId,
      })
      .select(
        `
      id,
      category,
      subject,
      description,
      priority,
      status,
      response_message,
      created_at,
      updated_at,
      resolved_at
    `,
      )
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('HR request created successfully', data);
  },
);

export { createSelfServiceRequestController };
