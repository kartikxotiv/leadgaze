/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import { getPayrollContext } from '../payroll-context';

export const salaryComponentController = {
  list: catchAsync(async ({ request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const { data, error } = await hrms
      .from('salary_components')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('type, name', { ascending: true });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  create: catchAsync(async ({ body, request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const data = body as {
      code: string;
      name: string;
      type: 'earning' | 'deduction' | 'employer_contribution';
      taxable: boolean;
      is_statutory: boolean;
      is_active: boolean;
    };

    const { data: created, error } = await hrms
      .from('salary_components')
      .insert({
        workspace_id: workspaceId,
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type,
        taxable: data.taxable,
        is_statutory: data.is_statutory,
        is_active: data.is_active,
        created_by: userId,
        updated_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(created);
  }),

  update: catchAsync(async ({ params, body, request, user }) => {
    const id = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const data = body as {
      code?: string;
      name?: string;
      type?: 'earning' | 'deduction' | 'employer_contribution';
      taxable?: boolean;
      is_statutory?: boolean;
      is_active?: boolean;
    };

    const { data: updated, error } = await hrms
      .from('salary_components')
      .update({
        ...data,
        code: data.code?.toUpperCase(),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(updated);
  }),

  delete: catchAsync(async ({ params, request, user }) => {
    const id = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const { error } = await hrms
      .from('salary_components')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
