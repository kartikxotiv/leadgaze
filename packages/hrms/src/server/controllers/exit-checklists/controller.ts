import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requirePermission } from '~/lib/server/rbac';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  BaseSeparationItem,
  ExtendedDatabase,
  ensureEmployeeInOrganization,
  getRequiredOrganizationId,
  getResignationOrThrow,
} from '../separation/utils';

type ExitChecklistBody = {
  employee_id: string;
  resignation_id?: string | null;
  checklist_item_id?: string | null;
  checklist_item_ids?: string[];
  task_name?: string;
  task_category?: 'IT' | 'ADMIN' | 'HR' | 'FINANCE';
  owner_employee_id?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  description?: string | null;
  remarks?: string | null;
};

const exitChecklistSelect = `
  id,
  employee_id,
  resignation_id,
  checklist_item_id,
  task_name,
  task_category,
  owner_employee_id,
  due_date,
  completed_at,
  description,
  remarks,
  created_at,
  updated_at,
  employee:employees!exit_checklists_employee_id_fkey!inner(
    id,
    first_name,
    last_name,
    employee_code,
    organization_id
  ),
  owner:employees!exit_checklists_owner_employee_id_fkey(
    id,
    first_name,
    last_name,
    employee_code
  ),
  checklist_item:exit_checklist_items(
    id,
    title,
    description
  )
`;

async function getChecklistItemsOrThrow(params: {
  itemIds: string[];
  organizationId: string;
}): Promise<{ id: string; title: string; description: string | null }[]> {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();

  const { data, error } = await supabaseAdmin
    .from('exit_checklist_items')
    .select('id, title, description')
    .eq('organization_id', params.organizationId)
    .in('id', params.itemIds);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const items =
    (data as unknown as {
      id: string;
      title: string;
      description: string | null;
    }[]) ?? [];

  if (items.length !== params.itemIds.length) {
    throw new ApiError('One or more checklist items are invalid', 400);
  }

  return items;
}

const listExitChecklistsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_checklist',
    minAccessLevel: 'team',
  });

  const { data: employees, error: employeesError } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', organizationId);

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  const employeeIds = (employees ?? [])
    .map((employee: { id: string | null }) => employee.id)
    .filter((id: string | null): id is string => Boolean(id));

  if (employeeIds.length === 0) {
    return successDataResponse('Exit checklists fetched successfully', []);
  }

  const { data, error } = await supabaseAdmin
    .from('exit_checklists')
    .select(exitChecklistSelect)
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const items = (data as unknown as BaseSeparationItem[]) ?? [];
  const rows = items.map((item) => {
    const next = { ...item };

    if (next.employee?.organization_id) {
      delete next.employee.organization_id;
    }

    return next;
  });

  return successDataResponse('Exit checklists fetched successfully', rows);
});

const getExitChecklistController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const checklistId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_checklist',
    minAccessLevel: 'team',
  });

  if (!checklistId) {
    throw new ApiError('Exit checklist id is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('exit_checklists')
    .select(exitChecklistSelect)
    .eq('id', checklistId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Exit checklist fetched successfully', result);
});

const createExitChecklistController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as ExitChecklistBody;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_checklist',
    minAccessLevel: 'team',
  });

  await ensureEmployeeInOrganization({
    employeeId: payload.employee_id,
    organizationId,
  });

  if (payload.resignation_id) {
    const resignation = await getResignationOrThrow({
      resignationId: payload.resignation_id,
      organizationId,
    });

    if (resignation.employee_id !== payload.employee_id) {
      throw new ApiError('resignation_id does not belong to employee_id', 400);
    }
  }

  if (payload.owner_employee_id) {
    await ensureEmployeeInOrganization({
      employeeId: payload.owner_employee_id,
      organizationId,
      fieldName: 'owner_employee_id',
    });
  }

  const checklistItemIds = payload.checklist_item_ids?.length
    ? payload.checklist_item_ids
    : payload.checklist_item_id
      ? [payload.checklist_item_id]
      : [];

  if (checklistItemIds.length === 0 && !payload.task_name?.trim()) {
    throw new ApiError('Select a checklist item or enter a task name', 400);
  }

  const checklistItems = checklistItemIds.length
    ? await getChecklistItemsOrThrow({
        itemIds: checklistItemIds,
        organizationId,
      })
    : [];
  const checklistItemById = new Map(
    checklistItems.map((item) => [item.id, item]),
  );
  const rows = checklistItemIds.length
    ? checklistItemIds.map((itemId) => {
        const item = checklistItemById.get(itemId);

        if (!item) {
          throw new ApiError('One or more checklist items are invalid', 400);
        }

        return {
          employee_id: payload.employee_id,
          resignation_id: payload.resignation_id ?? null,
          checklist_item_id: item.id,
          task_name: item.title,
          task_category: payload.task_category ?? 'HR',
          owner_employee_id: payload.owner_employee_id ?? null,
          due_date: payload.due_date ?? null,
          completed_at: payload.completed_at ?? null,
          description: item.description ?? null,
          remarks: payload.remarks ?? null,
        };
      })
    : [
        {
          employee_id: payload.employee_id,
          resignation_id: payload.resignation_id ?? null,
          checklist_item_id: payload.checklist_item_id ?? null,
          task_name: payload.task_name!,
          task_category: payload.task_category ?? 'HR',
          owner_employee_id: payload.owner_employee_id ?? null,
          due_date: payload.due_date ?? null,
          completed_at: payload.completed_at ?? null,
          description: payload.description ?? null,
          remarks: payload.remarks ?? null,
        },
      ];

  const { data, error } = await supabaseAdmin
    .from('exit_checklists')
    .insert(rows)
    .select(exitChecklistSelect)
    .returns<BaseSeparationItem[]>();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const results = ((data as unknown as BaseSeparationItem[]) ?? []).map(
    (item) => {
      const next = { ...item };

      if (next.employee?.organization_id) {
        delete next.employee.organization_id;
      }

      return next;
    },
  );

  return successDataResponse('Exit checklist created successfully', results);
});

const updateExitChecklistController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const checklistId = params?.id;
    const payload = body as Partial<ExitChecklistBody>;
    await requirePermission({
      accountId: user!.id,
      organizationId,
      moduleKey: 'separation',
      featureKey: 'manage_checklist',
      minAccessLevel: 'team',
    });

    if (!checklistId) {
      throw new ApiError('Exit checklist id is required', 400);
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('exit_checklists')
      .select(
        'id, employee_id, resignation_id, employee:employees!exit_checklists_employee_id_fkey!inner(id, organization_id)',
      )
      .eq('id', checklistId)
      .eq('employee.organization_id', organizationId)
      .maybeSingle();

    if (existingError) {
      throw new ApiError(existingError.message, 400);
    }

    if (!existing) {
      throw new ApiError('Exit checklist not found', 404);
    }

    const existingItem = existing as unknown as BaseSeparationItem;
    const hasResignationId = Object.prototype.hasOwnProperty.call(
      payload,
      'resignation_id',
    );
    const nextEmployeeId = (payload.employee_id ??
      existingItem.employee_id) as string;
    const nextResignationId = (
      hasResignationId ? payload.resignation_id : existingItem.resignation_id
    ) as string | null;

    if (payload.employee_id) {
      await ensureEmployeeInOrganization({
        employeeId: payload.employee_id,
        organizationId,
      });
    }

    if (payload.resignation_id) {
      await getResignationOrThrow({
        resignationId: payload.resignation_id,
        organizationId,
      });
    }

    if (nextResignationId) {
      const resignation = await getResignationOrThrow({
        resignationId: nextResignationId,
        organizationId,
      });

      if (resignation.employee_id !== nextEmployeeId) {
        throw new ApiError(
          'resignation_id does not belong to employee_id',
          400,
        );
      }
    }

    if (payload.owner_employee_id) {
      await ensureEmployeeInOrganization({
        employeeId: payload.owner_employee_id,
        organizationId,
        fieldName: 'owner_employee_id',
      });
    }

    if (payload.checklist_item_id) {
      const [item] = await getChecklistItemsOrThrow({
        itemIds: [payload.checklist_item_id],
        organizationId,
      });

      if (!item) {
        throw new ApiError('Checklist item is invalid', 400);
      }

      payload.task_name = payload.task_name ?? item.title;
      payload.description = payload.description ?? item.description;
    }

    const { data, error } = await supabaseAdmin
      .from('exit_checklists')
      .update({
        employee_id: payload.employee_id,
        resignation_id: payload.resignation_id,
        checklist_item_id: payload.checklist_item_id,
        task_name: payload.task_name,
        task_category: payload.task_category,
        owner_employee_id: payload.owner_employee_id,
        due_date: payload.due_date,
        completed_at: payload.completed_at,
        description: payload.description,
        remarks: payload.remarks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', checklistId)
      .select(exitChecklistSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const result = data as unknown as BaseSeparationItem;

    if (result.employee?.organization_id) {
      delete result.employee.organization_id;
    }

    return successDataResponse('Exit checklist updated successfully', result);
  },
);

const deleteExitChecklistController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const checklistId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_checklist',
    minAccessLevel: 'team',
  });

  if (!checklistId) {
    throw new ApiError('Exit checklist id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('exit_checklists')
    .select(
      'id, employee:employees!exit_checklists_employee_id_fkey!inner(id, organization_id)',
    )
    .eq('id', checklistId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Exit checklist not found', 404);
  }

  const { error } = await supabaseAdmin
    .from('exit_checklists')
    .delete()
    .eq('id', checklistId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Exit checklist deleted successfully', null);
});

export {
  createExitChecklistController,
  deleteExitChecklistController,
  getExitChecklistController,
  listExitChecklistsController,
  updateExitChecklistController,
};
