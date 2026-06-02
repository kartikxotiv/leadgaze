import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requirePermission } from '~/lib/server/rbac';
import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

import {
  ensureEmployeeInOrganization,
  getRequiredOrganizationId,
  getResignationOrThrow,
  BaseSeparationItem,
  ExtendedDatabase,
} from '../separation/utils';

type AssetClearanceBody = {
  employee_id: string;
  resignation_id?: string | null;
  asset_name: string;
  asset_tag?: string | null;
  issued_date?: string | null;
  returned_date?: string | null;
  condition_at_return?: 'PENDING' | 'GOOD' | 'DAMAGED' | 'LOST';
  remarks?: string | null;
  status?: 'PENDING' | 'RETURNED' | 'WAIVED';
  cleared_by?: string | null;
  cleared_at?: string | null;
};

const assetClearanceSelect = `
  id,
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
  employee:employees!asset_clearances_employee_id_fkey!inner(
    id,
    first_name,
    last_name,
    employee_code,
    organization_id
  ),
  cleared_by_employee:employees!asset_clearances_cleared_by_fkey(
    id,
    first_name,
    last_name,
    employee_code
  )
`;

const listAssetClearancesController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_assets',
    minAccessLevel: 'team',
  });

  const { data, error } = await supabaseAdmin
    .from('asset_clearances')
    .select(assetClearanceSelect)
    .eq('employee.organization_id', organizationId)
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

  return successDataResponse('Asset clearances fetched successfully', rows);
});

const getAssetClearanceController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const clearanceId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_assets',
    minAccessLevel: 'team',
  });

  if (!clearanceId) {
    throw new ApiError('Asset clearance id is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('asset_clearances')
    .select(assetClearanceSelect)
    .eq('id', clearanceId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Asset clearance fetched successfully', result);
});

const createAssetClearanceController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as AssetClearanceBody;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_assets',
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

  if (payload.cleared_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.cleared_by,
      organizationId,
      fieldName: 'cleared_by',
    });
  }

  const { data } = await supabaseAdmin
    .from('asset_clearances')
    .insert({
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
    })
    .select(assetClearanceSelect)
    .single();

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Asset clearance created successfully', result);
});

const updateAssetClearanceController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const clearanceId = params?.id;
  const payload = body as Partial<AssetClearanceBody>;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_assets',
    minAccessLevel: 'team',
  });

  if (!clearanceId) {
    throw new ApiError('Asset clearance id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('asset_clearances')
    .select('id, employee_id, resignation_id, employee:employees!asset_clearances_employee_id_fkey!inner(id, organization_id)')
    .eq('id', clearanceId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Asset clearance not found', 404);
  }

  const nextEmployeeId = payload.employee_id ?? (existing as unknown as BaseSeparationItem).employee_id as string;
  const nextResignationId =
    payload.resignation_id === undefined
      ? (existing as unknown as BaseSeparationItem).resignation_id as string
      : (payload.resignation_id as string);

  if (payload.employee_id) {
    await ensureEmployeeInOrganization({
      employeeId: payload.employee_id,
      organizationId,
    });
  }

  if (payload.cleared_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.cleared_by,
      organizationId,
      fieldName: 'cleared_by',
    });
  }

  if (nextResignationId) {
    const resignation = await getResignationOrThrow({
      resignationId: nextResignationId,
      organizationId,
    });

    if (resignation.employee_id !== nextEmployeeId) {
      throw new ApiError('resignation_id does not belong to employee_id', 400);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('asset_clearances')
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', clearanceId)
    .select(assetClearanceSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Asset clearance updated successfully', result);
});

const deleteAssetClearanceController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const clearanceId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_assets',
    minAccessLevel: 'team',
  });

  if (!clearanceId) {
    throw new ApiError('Asset clearance id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('asset_clearances')
    .select('id, employee:employees!asset_clearances_employee_id_fkey!inner(id, organization_id)')
    .eq('id', clearanceId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Asset clearance not found', 404);
  }

  const { error } = await supabaseAdmin
    .from('asset_clearances')
    .delete()
    .eq('id', clearanceId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Asset clearance deleted successfully', null);
});

export {
  createAssetClearanceController,
  deleteAssetClearanceController,
  getAssetClearanceController,
  listAssetClearancesController,
  updateAssetClearanceController,
};
