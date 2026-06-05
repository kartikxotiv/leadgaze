/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import { getPayrollContext } from '../payroll-context';

export const salaryStructureController = {
  list: catchAsync(async ({ request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const { data, error } = await hrms
      .from('salary_structures')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  create: catchAsync(async ({ body, request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const data = body as {
      name: string;
      description?: string;
      currency_code: string;
      is_active: boolean;
    };

    const { data: created, error } = await hrms
      .from('salary_structures')
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description ?? null,
        currency_code: data.currency_code,
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
      name?: string;
      description?: string;
      currency_code?: string;
      is_active?: boolean;
    };

    const { data: updated, error } = await hrms
      .from('salary_structures')
      .update({
        ...data,
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
      .from('salary_structures')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),

  listComponents: catchAsync(async ({ params, request, user }) => {
    const structureId = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const { data, error } = await hrms
      .from('salary_structure_components')
      .select('*, salary_component:salary_components(*)')
      .eq('salary_structure_id', structureId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  addComponent: catchAsync(async ({ params, body, request, user }) => {
    const structureId = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const data = body as {
      salary_component_id: string;
      calculation_type: string;
      calculation_value: number;
      is_recurring?: boolean;
      is_pro_ratable?: boolean;
      display_order?: number;
    };

    const { data: created, error } = await hrms
      .from('salary_structure_components')
      .insert({
        workspace_id: workspaceId,
        salary_structure_id: structureId,
        salary_component_id: data.salary_component_id,
        calculation_type: data.calculation_type,
        calculation_value: data.calculation_value,
        is_recurring: data.is_recurring ?? true,
        is_pro_ratable: data.is_pro_ratable ?? true,
        display_order: data.display_order ?? 100,
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

  updateComponent: catchAsync(async ({ params, body, request, user }) => {
    const id = params?.componentId as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const data = body as {
      calculation_type?: string;
      calculation_value?: number;
      is_recurring?: boolean;
      is_pro_ratable?: boolean;
      display_order?: number;
    };

    const { data: updated, error } = await hrms
      .from('salary_structure_components')
      .update({
        ...data,
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

  removeComponent: catchAsync(async ({ params, request, user }) => {
    const id = params?.componentId as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      request,
      user,
    });

    const { error } = await hrms
      .from('salary_structure_components')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
