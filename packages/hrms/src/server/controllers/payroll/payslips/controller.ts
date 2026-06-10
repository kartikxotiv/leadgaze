/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import { getPayrollContext } from '../payroll-context';

export const payslipController = {
  list: catchAsync(async ({ request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const { data, error } = await hrms
      .from('payslips')
      .select('*, employee:employees(*), payroll_run:payroll_runs(*)')
      .eq('workspace_id', workspaceId)
      .order('generated_at', { ascending: false });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  listComponents: catchAsync(async ({ params, request, user }) => {
    const payslipId = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const { data, error } = await hrms
      .from('payslip_components')
      .select('*, salary_component:salary_components(*)')
      .eq('payslip_id', payslipId)
      .eq('workspace_id', workspaceId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),
};
