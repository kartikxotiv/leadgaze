/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const payslipController = {
  list: catchAsync(async ({ user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('payslips')
      .select('*, employee:employees(*), payroll_run:payroll_runs(*)')
      .eq('organization_id', organizationId)
      .order('generated_at', { ascending: false });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  listComponents: catchAsync(async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const payslipId = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('payslip_components')
      .select('*, salary_component:salary_components(*)')
      .eq('payslip_id', payslipId)
      .eq('organization_id', organizationId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),
};
