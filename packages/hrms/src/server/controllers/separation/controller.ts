/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';

const moduleKey = 'hrms_separation';

type ChecklistItemRow = {
  description: string | null;
  id: string;
  title: string;
};

const employeeSelect = 'id, first_name, last_name, employee_code, designation';

const resignationSelect = `
  id,
  workspace_id,
  employee_id,
  resignation_date,
  last_working_day,
  notice_period_days,
  notice_waiver_days,
  reason,
  status,
  remarks,
  accepted_by,
  accepted_at,
  created_at,
  updated_at,
  employee:employees!resignation_requests_employee_id_fkey(${employeeSelect}),
  accepted_by_employee:employees!resignation_requests_accepted_by_fkey(${employeeSelect})
`;

const checklistSelect = `
  id,
  workspace_id,
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
  employee:employees!exit_checklists_employee_id_fkey(${employeeSelect}),
  owner:employees!exit_checklists_owner_employee_id_fkey(${employeeSelect}),
  checklist_item:exit_checklist_items!exit_checklists_checklist_item_id_fkey(id, title, description)
`;

const assetSelect = `
  id,
  workspace_id,
  employee_id,
  resignation_id,
  asset_name,
  asset_tag,
  issued_date,
  returned_date,
  condition_at_return,
  remarks,
  status,
  cleared_by,
  cleared_at,
  created_at,
  updated_at,
  employee:employees!asset_clearances_employee_id_fkey(${employeeSelect}),
  cleared_by_employee:employees!asset_clearances_cleared_by_fkey(${employeeSelect})
`;

const fnfSelect = `
  id,
  workspace_id,
  employee_id,
  payroll_run_id,
  last_working_day,
  components,
  leave_encashment,
  gratuity,
  notice_recovery,
  total_payable,
  tds_on_fnf,
  net_payable,
  status,
  settlement_date,
  remarks,
  created_at,
  updated_at,
  employee:employees!fnf_settlements_employee_id_fkey(${employeeSelect})
`;

const letterSelect = `
  id,
  workspace_id,
  employee_id,
  resignation_id,
  letter_type,
  issued_by,
  issued_at,
  letter_number,
  letter_url,
  remarks,
  status,
  created_at,
  updated_at,
  employee:employees!employee_exit_letters_employee_id_fkey(${employeeSelect}),
  issued_by_employee:employees!employee_exit_letters_issued_by_fkey(${employeeSelect})
`;

type ControllerContext = {
  currentEmployeeId: string | null;
  hrms: any;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
};

async function getContext(params: { request: NextRequest; user: unknown }) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(params.user);

  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const workspaceId = await getRequiredWorkspaceId({
    request: params.request,
    supabaseAdmin,
    userId,
  });
  const hrms = getHrmsClient(supabaseAdmin);
  const currentEmployeeId = await getCurrentEmployeeId({
    hrms,
    userId,
    workspaceId,
  });

  return {
    currentEmployeeId,
    hrms,
    supabaseAdmin,
    userId,
    workspaceId,
  } satisfies ControllerContext;
}

async function requireSeparationPermission(
  context: ControllerContext,
  featureKey: string,
  minAccessLevel: 'own' | 'team' | 'all' = 'own',
) {
  await requireEmployeePermission({
    featureKey,
    minAccessLevel,
    moduleKey,
    supabaseAdmin: context.supabaseAdmin,
    userId: context.userId,
    workspaceId: context.workspaceId,
  });
}

async function canUsePermission(
  context: ControllerContext,
  featureKey: string,
  minAccessLevel: 'own' | 'team' | 'all' = 'team',
) {
  try {
    await requireSeparationPermission(context, featureKey, minAccessLevel);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return false;
    }

    throw error;
  }
}

async function getCurrentEmployeeId(params: {
  hrms: any;
  userId: string;
  workspaceId: string;
}) {
  const { data, error } = await params.hrms
    .from('employees')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('account_id', params.userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (data as { id?: string } | null)?.id ?? null;
}

async function ensureEmployee(
  context: ControllerContext,
  employeeId?: string | null,
  fieldName = 'employee_id',
) {
  if (!employeeId) {
    throw new ApiError(`${fieldName} is required`, 400);
  }

  const { data, error } = await context.hrms
    .from('employees')
    .select('id')
    .eq('workspace_id', context.workspaceId)
    .eq('id', employeeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError(`${fieldName} is invalid`, 400);
  }
}

async function getResignation(
  context: ControllerContext,
  resignationId: string,
) {
  const { data, error } = await context.hrms
    .from('resignation_requests')
    .select('id, employee_id, status')
    .eq('workspace_id', context.workspaceId)
    .eq('id', resignationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Resignation request not found', 404);
  }

  return data as { employee_id: string; id: string; status: string };
}

async function ensureResignationBelongsToEmployee(
  context: ControllerContext,
  resignationId: string | null | undefined,
  employeeId: string,
) {
  if (!resignationId) {
    return;
  }

  const resignation = await getResignation(context, resignationId);

  if (resignation.employee_id !== employeeId) {
    throw new ApiError('resignation_id does not belong to employee_id', 400);
  }
}

function compact<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

async function getItemById(
  context: ControllerContext,
  tableName: string,
  id: string | undefined,
  select = 'id, employee_id',
  message = 'Record not found',
) {
  if (!id) {
    throw new ApiError('Record id is required', 400);
  }

  const { data, error } = await context.hrms
    .from(tableName)
    .select(select)
    .eq('workspace_id', context.workspaceId)
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError(message, 404);
  }

  return data as Record<string, any>;
}

const listResignationsController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'view_resignation', 'own');
  const canManage = await canUsePermission(
    context,
    'manage_resignation',
    'team',
  );

  let query = context.hrms
    .from('resignation_requests')
    .select(resignationSelect)
    .eq('workspace_id', context.workspaceId);

  if (!canManage) {
    if (!context.currentEmployeeId) {
      return successDataResponse('Resignations fetched successfully', []);
    }

    query = query.eq('employee_id', context.currentEmployeeId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Resignations fetched successfully', data ?? []);
});

const getResignationController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    const existing = await getResignation(context, params?.id ?? '');
    const canManage = await canUsePermission(
      context,
      'manage_resignation',
      'team',
    );

    if (!canManage && existing.employee_id !== context.currentEmployeeId) {
      throw new ApiError('Forbidden', 403);
    }

    await requireSeparationPermission(context, 'view_resignation', 'own');

    const { data, error } = await context.hrms
      .from('resignation_requests')
      .select(resignationSelect)
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Resignation fetched successfully', data);
  },
);

const getResignationByEmployeeIdController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    const employeeId = params?.employee_id;

    await ensureEmployee(context, employeeId);

    const canManage = await canUsePermission(
      context,
      'manage_resignation',
      'team',
    );

    if (!canManage && employeeId !== context.currentEmployeeId) {
      throw new ApiError('Forbidden', 403);
    }

    await requireSeparationPermission(context, 'view_resignation', 'own');

    const { data, error } = await context.hrms
      .from('resignation_requests')
      .select(resignationSelect)
      .eq('workspace_id', context.workspaceId)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Resignation fetched successfully', data);
  },
);

const createResignationController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;

    await requireSeparationPermission(context, 'create_resignation', 'own');

    const employeeId = payload.employee_id ?? context.currentEmployeeId;
    const isSelf = Boolean(
      employeeId && employeeId === context.currentEmployeeId,
    );

    if (!isSelf) {
      await requireSeparationPermission(context, 'manage_resignation', 'team');
    }

    await ensureEmployee(context, employeeId);

    if (payload.accepted_by) {
      await ensureEmployee(context, payload.accepted_by, 'accepted_by');
    }

    const { data: active, error: activeError } = await context.hrms
      .from('resignation_requests')
      .select('id')
      .eq('workspace_id', context.workspaceId)
      .eq('employee_id', employeeId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'])
      .limit(1)
      .maybeSingle();

    if (activeError) {
      throw new ApiError(activeError.message, 400);
    }

    if (active) {
      throw new ApiError(
        'An active resignation request already exists for this employee',
        400,
      );
    }

    const status = isSelf ? 'SUBMITTED' : (payload.status ?? 'SUBMITTED');
    const acceptedBy =
      status === 'ACCEPTED'
        ? (payload.accepted_by ?? context.currentEmployeeId ?? null)
        : (payload.accepted_by ?? null);

    const { data, error } = await context.hrms
      .from('resignation_requests')
      .insert({
        workspace_id: context.workspaceId,
        employee_id: employeeId,
        resignation_date: payload.resignation_date,
        last_working_day: isSelf ? null : (payload.last_working_day ?? null),
        notice_period_days: isSelf
          ? null
          : (payload.notice_period_days ?? null),
        notice_waiver_days: isSelf ? 0 : (payload.notice_waiver_days ?? 0),
        reason: payload.reason,
        status,
        remarks: isSelf ? null : (payload.remarks ?? null),
        accepted_by: isSelf ? null : acceptedBy,
        accepted_at: isSelf
          ? null
          : status === 'ACCEPTED'
            ? (payload.accepted_at ?? new Date().toISOString())
            : (payload.accepted_at ?? null),
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select(resignationSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    if (status === 'ACCEPTED') {
      await context.hrms
        .from('employees')
        .update({ status: 'notice_period', updated_by: context.userId })
        .eq('workspace_id', context.workspaceId)
        .eq('id', employeeId);
    }

    return successDataResponse('Resignation created successfully', data);
  },
);

const updateResignationController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    const existing = await getResignation(context, params?.id ?? '');

    await requireSeparationPermission(context, 'manage_resignation', 'team');

    if (payload.employee_id && payload.employee_id !== existing.employee_id) {
      throw new ApiError(
        'employee_id cannot be changed for a resignation',
        400,
      );
    }

    if (payload.accepted_by) {
      await ensureEmployee(context, payload.accepted_by, 'accepted_by');
    }

    const status = payload.status ?? existing.status;
    const { data, error } = await context.hrms
      .from('resignation_requests')
      .update(
        compact({
          resignation_date: payload.resignation_date,
          last_working_day: payload.last_working_day,
          notice_period_days: payload.notice_period_days,
          notice_waiver_days: payload.notice_waiver_days,
          reason: payload.reason,
          remarks: payload.remarks,
          status: payload.status,
          accepted_by:
            status === 'ACCEPTED'
              ? (payload.accepted_by ?? context.currentEmployeeId ?? null)
              : payload.accepted_by,
          accepted_at:
            status === 'ACCEPTED'
              ? (payload.accepted_at ?? new Date().toISOString())
              : payload.accepted_at,
          updated_by: context.userId,
        }),
      )
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id)
      .select(resignationSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    if (payload.status === 'ACCEPTED') {
      await context.hrms
        .from('employees')
        .update({ status: 'notice_period', updated_by: context.userId })
        .eq('workspace_id', context.workspaceId)
        .eq('id', existing.employee_id);
    }

    return successDataResponse('Resignation updated successfully', data);
  },
);

const deleteResignationController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    const existing = await getResignation(context, params?.id ?? '');
    const canManage = await canUsePermission(
      context,
      'manage_resignation',
      'team',
    );

    if (!canManage) {
      await requireSeparationPermission(context, 'view_resignation', 'own');

      if (existing.employee_id !== context.currentEmployeeId) {
        throw new ApiError('Forbidden', 403);
      }

      if (existing.status === 'ACCEPTED') {
        throw new ApiError(
          'Accepted resignations can only be changed by HR or a manager',
          400,
        );
      }
    }

    const { error } = await context.hrms
      .from('resignation_requests')
      .delete()
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Resignation deleted successfully', null);
  },
);

const listExitChecklistItemsController = catchAsync(
  async ({ request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'view_checklist', 'team');

    const { data, error } = await context.hrms
      .from('exit_checklist_items')
      .select('id, workspace_id, title, description, created_at, updated_at')
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Checklist items fetched successfully',
      data ?? [],
    );
  },
);

const createExitChecklistItemController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;

    await requireSeparationPermission(context, 'manage_checklist', 'team');

    const { data, error } = await context.hrms
      .from('exit_checklist_items')
      .insert({
        workspace_id: context.workspaceId,
        title: payload.title,
        description: payload.description ?? null,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select('id, workspace_id, title, description, created_at, updated_at')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Checklist item created successfully', data);
  },
);

const listExitChecklistsController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'view_checklist', 'team');

  const { data, error } = await context.hrms
    .from('exit_checklists')
    .select(checklistSelect)
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Exit checklists fetched successfully',
    data ?? [],
  );
});

const getExitChecklistController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'view_checklist', 'team');
    const existing = await getItemById(
      context,
      'exit_checklists',
      params?.id,
      'id',
      'Exit checklist not found',
    );

    const { data, error } = await context.hrms
      .from('exit_checklists')
      .select(checklistSelect)
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Exit checklist fetched successfully', data);
  },
);

const createExitChecklistController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;

    await requireSeparationPermission(context, 'manage_checklist', 'team');
    await ensureEmployee(context, payload.employee_id);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id,
      payload.employee_id,
    );

    if (payload.owner_employee_id) {
      await ensureEmployee(
        context,
        payload.owner_employee_id,
        'owner_employee_id',
      );
    }

    const itemIds = Array.isArray(payload.checklist_item_ids)
      ? payload.checklist_item_ids
      : payload.checklist_item_id
        ? [payload.checklist_item_id]
        : [];

    if (itemIds.length === 0 && !payload.task_name?.trim()) {
      throw new ApiError('Select a checklist item or enter a task name', 400);
    }

    const itemRows = itemIds.length
      ? await getChecklistItems(context, itemIds)
      : [];
    const itemById = new Map(itemRows.map((item) => [item.id, item]));

    const rows = itemIds.length
      ? itemIds.map((itemId: string) => {
          const item = itemById.get(itemId);

          if (!item) {
            throw new ApiError('One or more checklist items are invalid', 400);
          }

          return {
            workspace_id: context.workspaceId,
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
            created_by: context.userId,
            updated_by: context.userId,
          };
        })
      : [
          {
            workspace_id: context.workspaceId,
            employee_id: payload.employee_id,
            resignation_id: payload.resignation_id ?? null,
            checklist_item_id: payload.checklist_item_id ?? null,
            task_name: payload.task_name,
            task_category: payload.task_category ?? 'HR',
            owner_employee_id: payload.owner_employee_id ?? null,
            due_date: payload.due_date ?? null,
            completed_at: payload.completed_at ?? null,
            description: payload.description ?? null,
            remarks: payload.remarks ?? null,
            created_by: context.userId,
            updated_by: context.userId,
          },
        ];

    const { data, error } = await context.hrms
      .from('exit_checklists')
      .insert(rows)
      .select(checklistSelect);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Exit checklist created successfully',
      data ?? [],
    );
  },
);

async function getChecklistItems(
  context: ControllerContext,
  itemIds: string[],
): Promise<ChecklistItemRow[]> {
  const { data, error } = await context.hrms
    .from('exit_checklist_items')
    .select('id, title, description')
    .eq('workspace_id', context.workspaceId)
    .in('id', itemIds);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if ((data ?? []).length !== itemIds.length) {
    throw new ApiError('One or more checklist items are invalid', 400);
  }

  return (data ?? []) as ChecklistItemRow[];
}

const updateExitChecklistController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    const existing = await getItemById(
      context,
      'exit_checklists',
      params?.id,
      'id, employee_id, resignation_id',
      'Exit checklist not found',
    );

    await requireSeparationPermission(context, 'manage_checklist', 'team');

    const employeeId = payload.employee_id ?? existing.employee_id;
    await ensureEmployee(context, employeeId);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id === undefined
        ? existing.resignation_id
        : payload.resignation_id,
      employeeId,
    );

    if (payload.owner_employee_id) {
      await ensureEmployee(
        context,
        payload.owner_employee_id,
        'owner_employee_id',
      );
    }

    if (payload.checklist_item_id) {
      const [item] = await getChecklistItems(context, [
        payload.checklist_item_id,
      ]);
      payload.task_name = payload.task_name ?? item.title;
      payload.description = payload.description ?? item.description;
    }

    const { data, error } = await context.hrms
      .from('exit_checklists')
      .update(
        compact({
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
          updated_by: context.userId,
        }),
      )
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id)
      .select(checklistSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Exit checklist updated successfully', data);
  },
);

const deleteExitChecklistController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'manage_checklist', 'team');
    const existing = await getItemById(
      context,
      'exit_checklists',
      params?.id,
      'id',
      'Exit checklist not found',
    );

    const { error } = await context.hrms
      .from('exit_checklists')
      .delete()
      .eq('workspace_id', context.workspaceId)
      .eq('id', existing.id);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Exit checklist deleted successfully', null);
  },
);

const listAssetClearancesController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'view_assets', 'team');
  return listTable(
    context,
    'asset_clearances',
    assetSelect,
    'Asset clearances fetched successfully',
  );
});

const getAssetClearanceController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'view_assets', 'team');
    return getTableItem(
      context,
      'asset_clearances',
      params?.id,
      assetSelect,
      'Asset clearance fetched successfully',
      'Asset clearance not found',
    );
  },
);

const createAssetClearanceController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    await requireSeparationPermission(context, 'manage_assets', 'team');
    await ensureEmployee(context, payload.employee_id);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id,
      payload.employee_id,
    );

    if (payload.cleared_by) {
      await ensureEmployee(context, payload.cleared_by, 'cleared_by');
    }

    return createTableItem(
      context,
      'asset_clearances',
      assetSelect,
      {
        workspace_id: context.workspaceId,
        employee_id: payload.employee_id,
        resignation_id: payload.resignation_id ?? null,
        asset_name: payload.asset_name,
        asset_tag: payload.asset_tag ?? null,
        issued_date: payload.issued_date ?? null,
        returned_date: payload.returned_date ?? null,
        condition_at_return: payload.condition_at_return ?? 'PENDING',
        remarks: payload.remarks ?? null,
        status: payload.status ?? 'PENDING',
        cleared_by: payload.cleared_by ?? null,
        cleared_at: payload.cleared_at ?? null,
        created_by: context.userId,
        updated_by: context.userId,
      },
      'Asset clearance created successfully',
    );
  },
);

const updateAssetClearanceController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    const existing = await getItemById(
      context,
      'asset_clearances',
      params?.id,
      'id, employee_id, resignation_id',
      'Asset clearance not found',
    );
    await requireSeparationPermission(context, 'manage_assets', 'team');
    const employeeId = payload.employee_id ?? existing.employee_id;
    await ensureEmployee(context, employeeId);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id === undefined
        ? existing.resignation_id
        : payload.resignation_id,
      employeeId,
    );

    if (payload.cleared_by) {
      await ensureEmployee(context, payload.cleared_by, 'cleared_by');
    }

    return updateTableItem(
      context,
      'asset_clearances',
      existing.id,
      assetSelect,
      {
        employee_id: payload.employee_id,
        resignation_id: payload.resignation_id,
        asset_name: payload.asset_name,
        asset_tag: payload.asset_tag,
        issued_date: payload.issued_date,
        returned_date: payload.returned_date,
        condition_at_return: payload.condition_at_return,
        remarks: payload.remarks,
        status: payload.status,
        cleared_by: payload.cleared_by,
        cleared_at: payload.cleared_at,
        updated_by: context.userId,
      },
      'Asset clearance updated successfully',
    );
  },
);

const deleteAssetClearanceController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'manage_assets', 'team');
    return deleteTableItem(
      context,
      'asset_clearances',
      params?.id,
      'Asset clearance deleted successfully',
      'Asset clearance not found',
    );
  },
);

const listFnfSettlementsController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'view_fnf', 'team');
  return listTable(
    context,
    'fnf_settlements',
    fnfSelect,
    'FnF settlements fetched successfully',
  );
});

const getFnfSettlementController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'view_fnf', 'team');
    return getTableItem(
      context,
      'fnf_settlements',
      params?.id,
      fnfSelect,
      'FnF settlement fetched successfully',
      'FnF settlement not found',
    );
  },
);

const createFnfSettlementController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    await requireSeparationPermission(context, 'manage_fnf', 'team');
    await ensureEmployee(context, payload.employee_id);

    return createTableItem(
      context,
      'fnf_settlements',
      fnfSelect,
      {
        workspace_id: context.workspaceId,
        employee_id: payload.employee_id,
        payroll_run_id: payload.payroll_run_id ?? null,
        last_working_day: payload.last_working_day,
        components: payload.components ?? [],
        leave_encashment: payload.leave_encashment ?? 0,
        gratuity: payload.gratuity ?? 0,
        notice_recovery: payload.notice_recovery ?? 0,
        total_payable: payload.total_payable ?? 0,
        tds_on_fnf: payload.tds_on_fnf ?? 0,
        net_payable: payload.net_payable ?? 0,
        status: payload.status ?? 'DRAFT',
        settlement_date: payload.settlement_date ?? null,
        remarks: payload.remarks ?? null,
        created_by: context.userId,
        updated_by: context.userId,
      },
      'FnF settlement created successfully',
    );
  },
);

const updateFnfSettlementController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    const existing = await getItemById(
      context,
      'fnf_settlements',
      params?.id,
      'id, employee_id',
      'FnF settlement not found',
    );
    await requireSeparationPermission(context, 'manage_fnf', 'team');

    if (payload.employee_id) {
      await ensureEmployee(context, payload.employee_id);
    }

    return updateTableItem(
      context,
      'fnf_settlements',
      existing.id,
      fnfSelect,
      {
        employee_id: payload.employee_id,
        payroll_run_id: payload.payroll_run_id,
        last_working_day: payload.last_working_day,
        components: payload.components,
        leave_encashment: payload.leave_encashment,
        gratuity: payload.gratuity,
        notice_recovery: payload.notice_recovery,
        total_payable: payload.total_payable,
        tds_on_fnf: payload.tds_on_fnf,
        net_payable: payload.net_payable,
        status: payload.status,
        settlement_date: payload.settlement_date,
        remarks: payload.remarks,
        updated_by: context.userId,
      },
      'FnF settlement updated successfully',
    );
  },
);

const deleteFnfSettlementController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'manage_fnf', 'team');
    return deleteTableItem(
      context,
      'fnf_settlements',
      params?.id,
      'FnF settlement deleted successfully',
      'FnF settlement not found',
    );
  },
);

const listExitLettersController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'view_letters', 'team');
  return listTable(
    context,
    'employee_exit_letters',
    letterSelect,
    'Exit letters fetched successfully',
  );
});

const getExitLetterController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'view_letters', 'team');
    return getTableItem(
      context,
      'employee_exit_letters',
      params?.id,
      letterSelect,
      'Exit letter fetched successfully',
      'Exit letter not found',
    );
  },
);

const createExitLetterController = catchAsync(
  async ({ body, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    await requireSeparationPermission(context, 'manage_letters', 'team');
    await ensureEmployee(context, payload.employee_id);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id,
      payload.employee_id,
    );

    if (payload.issued_by) {
      await ensureEmployee(context, payload.issued_by, 'issued_by');
    }

    return createTableItem(
      context,
      'employee_exit_letters',
      letterSelect,
      {
        workspace_id: context.workspaceId,
        employee_id: payload.employee_id,
        resignation_id: payload.resignation_id ?? null,
        letter_type: payload.letter_type,
        issued_by: payload.issued_by ?? null,
        issued_at: payload.issued_at ?? null,
        letter_number: payload.letter_number ?? null,
        letter_url: payload.letter_url ?? null,
        remarks: payload.remarks ?? null,
        status: payload.status ?? 'DRAFT',
        created_by: context.userId,
        updated_by: context.userId,
      },
      'Exit letter created successfully',
    );
  },
);

const updateExitLetterController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const payload = body as Record<string, any>;
    const existing = await getItemById(
      context,
      'employee_exit_letters',
      params?.id,
      'id, employee_id, resignation_id',
      'Exit letter not found',
    );
    await requireSeparationPermission(context, 'manage_letters', 'team');
    const employeeId = payload.employee_id ?? existing.employee_id;
    await ensureEmployee(context, employeeId);
    await ensureResignationBelongsToEmployee(
      context,
      payload.resignation_id === undefined
        ? existing.resignation_id
        : payload.resignation_id,
      employeeId,
    );

    if (payload.issued_by) {
      await ensureEmployee(context, payload.issued_by, 'issued_by');
    }

    return updateTableItem(
      context,
      'employee_exit_letters',
      existing.id,
      letterSelect,
      {
        employee_id: payload.employee_id,
        resignation_id: payload.resignation_id,
        letter_type: payload.letter_type,
        issued_by: payload.issued_by,
        issued_at: payload.issued_at,
        letter_number: payload.letter_number,
        letter_url: payload.letter_url,
        remarks: payload.remarks,
        status: payload.status,
        updated_by: context.userId,
      },
      'Exit letter updated successfully',
    );
  },
);

const deleteExitLetterController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getContext({ request, user });
    await requireSeparationPermission(context, 'manage_letters', 'team');
    return deleteTableItem(
      context,
      'employee_exit_letters',
      params?.id,
      'Exit letter deleted successfully',
      'Exit letter not found',
    );
  },
);

const listPayrollRunsController = catchAsync(async ({ request, user }) => {
  const context = await getContext({ request, user });
  await requireSeparationPermission(context, 'manage_fnf', 'team');

  try {
    const { data, error } = await context.hrms
      .from('payroll_runs')
      .select('id, name, period')
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return successDataResponse('Payroll runs fetched successfully', []);
    }

    return successDataResponse('Payroll runs fetched successfully', data ?? []);
  } catch {
    return successDataResponse('Payroll runs fetched successfully', []);
  }
});

async function listTable(
  context: ControllerContext,
  tableName: string,
  select: string,
  message: string,
) {
  const { data, error } = await context.hrms
    .from(tableName)
    .select(select)
    .eq('workspace_id', context.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(message, data ?? []);
}

async function getTableItem(
  context: ControllerContext,
  tableName: string,
  id: string | undefined,
  select: string,
  successMessage: string,
  notFoundMessage: string,
) {
  const existing = await getItemById(
    context,
    tableName,
    id,
    'id',
    notFoundMessage,
  );
  const { data, error } = await context.hrms
    .from(tableName)
    .select(select)
    .eq('workspace_id', context.workspaceId)
    .eq('id', existing.id)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(successMessage, data);
}

async function createTableItem(
  context: ControllerContext,
  tableName: string,
  select: string,
  payload: Record<string, unknown>,
  message: string,
) {
  const { data, error } = await context.hrms
    .from(tableName)
    .insert(payload)
    .select(select)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(message, data);
}

async function updateTableItem(
  context: ControllerContext,
  tableName: string,
  id: string,
  select: string,
  payload: Record<string, unknown>,
  message: string,
) {
  const { data, error } = await context.hrms
    .from(tableName)
    .update(compact(payload))
    .eq('workspace_id', context.workspaceId)
    .eq('id', id)
    .select(select)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(message, data);
}

async function deleteTableItem(
  context: ControllerContext,
  tableName: string,
  id: string | undefined,
  successMessage: string,
  notFoundMessage: string,
) {
  const existing = await getItemById(
    context,
    tableName,
    id,
    'id',
    notFoundMessage,
  );
  const { error } = await context.hrms
    .from(tableName)
    .delete()
    .eq('workspace_id', context.workspaceId)
    .eq('id', existing.id);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(successMessage, null);
}

export {
  createAssetClearanceController,
  createExitChecklistController,
  createExitChecklistItemController,
  createExitLetterController,
  createFnfSettlementController,
  createResignationController,
  deleteAssetClearanceController,
  deleteExitChecklistController,
  deleteExitLetterController,
  deleteFnfSettlementController,
  deleteResignationController,
  getAssetClearanceController,
  getExitChecklistController,
  getExitLetterController,
  getFnfSettlementController,
  getResignationByEmployeeIdController,
  getResignationController,
  listAssetClearancesController,
  listExitChecklistItemsController,
  listExitChecklistsController,
  listExitLettersController,
  listFnfSettlementsController,
  listPayrollRunsController,
  listResignationsController,
  updateAssetClearanceController,
  updateExitChecklistController,
  updateExitLetterController,
  updateFnfSettlementController,
  updateResignationController,
};
