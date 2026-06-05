/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import { getPayrollContext } from '../payroll-context';

export const employeePayItemController = {
  create: catchAsync(async ({ body, request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const data = body as {
      employee_id: string;
      salary_component_id: string;
      amount: number;
      effective_date: string;
      notes?: string;
    };

    const { data: created, error } = await hrms
      .from('employee_pay_items')
      .insert({
        workspace_id: workspaceId,
        employee_id: data.employee_id,
        salary_component_id: data.salary_component_id,
        amount: data.amount,
        effective_date: data.effective_date,
        notes: data.notes ?? null,
        status: 'approved',
        created_by: userId,
        updated_by: userId,
      })
      .select(
        `*, salary_component:salary_components(name), employee:employees(first_name, last_name)`,
      )
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
      amount?: number;
      effective_date?: string;
      notes?: string;
    };

    const { data: updated, error } = await hrms
      .from('employee_pay_items')
      .update({
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select(
        `*, salary_component:salary_components(name), employee:employees(first_name, last_name)`,
      )
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
      .from('employee_pay_items')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
