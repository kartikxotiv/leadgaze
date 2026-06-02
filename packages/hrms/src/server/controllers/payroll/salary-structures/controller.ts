/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const salaryStructureController = {
  list: catchAsync(async ({ user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('salary_structures')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

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
      name: string;
      description?: string;
      currency_code: string;
      is_active: boolean;
    };

    const { data: created, error } = await (supabaseAdmin as any)
      .from('salary_structures')
      .insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description ?? null,
        currency_code: data.currency_code,
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
      name?: string;
      description?: string;
      currency_code?: string;
      is_active?: boolean;
    };

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('salary_structures')
      .update({
        ...data,
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
      .from('salary_structures')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),

  listComponents: catchAsync(async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const structureId = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('salary_structure_components')
      .select('*, salary_component:salary_components(*)')
      .eq('salary_structure_id', structureId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  addComponent: catchAsync(async ({ params, body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const structureId = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      salary_component_id: string;
      calculation_type: string;
      calculation_value: number;
      is_recurring?: boolean;
      is_pro_ratable?: boolean;
      display_order?: number;
    };

    const { data: created, error } = await (supabaseAdmin as any)
      .from('salary_structure_components')
      .insert({
        organization_id: organizationId,
        salary_structure_id: structureId,
        salary_component_id: data.salary_component_id,
        calculation_type: data.calculation_type,
        calculation_value: data.calculation_value,
        is_recurring: data.is_recurring ?? true,
        is_pro_ratable: data.is_pro_ratable ?? true,
        display_order: data.display_order ?? 100,
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

  updateComponent: catchAsync(async ({ params, body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.componentId as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      calculation_type?: string;
      calculation_value?: number;
      is_recurring?: boolean;
      is_pro_ratable?: boolean;
      display_order?: number;
    };

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('salary_structure_components')
      .update({
        ...data,
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

  removeComponent: catchAsync(async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.componentId as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { error } = await (supabaseAdmin as any)
      .from('salary_structure_components')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
