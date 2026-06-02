/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const salaryComponentController = {
  list: catchAsync(async ({ user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('salary_components')
      .select('*')
      .eq('organization_id', organizationId)
      .order('type, name', { ascending: true });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  create: catchAsync(async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      code: string;
      name: string;
      type: 'earning' | 'deduction' | 'employer_contribution';
      taxable: boolean;
      is_statutory: boolean;
      is_active: boolean;
    };

    const { data: created, error } = await (supabaseAdmin as any)
      .from('salary_components')
      .insert({
        organization_id: organizationId,
        code: data.code.toUpperCase(),
        name: data.name,
        type: data.type,
        taxable: data.taxable,
        is_statutory: data.is_statutory,
        is_active: data.is_active,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(created);
  }),

  update: catchAsync(async ({ params, body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      code?: string;
      name?: string;
      type?: 'earning' | 'deduction' | 'employer_contribution';
      taxable?: boolean;
      is_statutory?: boolean;
      is_active?: boolean;
    };

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('salary_components')
      .update({
        ...data,
        code: data.code?.toUpperCase(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(updated);
  }),

  delete: catchAsync(async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { error } = await (supabaseAdmin as any)
      .from('salary_components')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
