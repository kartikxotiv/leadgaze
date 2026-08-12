import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

// Column mapping for direct SQL sorting
const ACCOUNT_SORT_COLUMNS: Record<string, string> = {
  account_name:         'account_name',
  website:              'website',
  phone_number:         'phone_number',
  company_size:         'company_size',
  billing_street:       'billing_street',
  billing_city:         'billing_city',
  billing_state:        'billing_state',
  billing_postal_code:  'billing_postal_code',
  billing_country:      'billing_country',
  created_at:           'created_at',
  'industry.industry_name':      'industry_name',
  'owner.name':                  'owner_name',
  'created_by_account.name':     'created_by_account_name',
  'updated_by_account.name':     'updated_by_account_name',
};

/**
 * GET /api/accounts
 * Fetch all accounts for a workspace using optimized database view vw_crm_accounts_list
 */
export const getAccounts = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const sortColumn = url.searchParams.get('sortColumn') || '';
    const sortDirection = url.searchParams.get('sortDirection') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: true,
    });

    if (accessError || !accessResult) {
      console.error('Workspace access resolution error:', accessError);
      return NextResponse.json(
        { message: 'Failed to verify workspace access' },
        { status: 500 },
      );
    }

    const {
      is_owner: isOwner,
      is_member: isMember,
      hierarchy_type: hierarchyType,
      visible_user_ids: rpcVisibleUserIds,
    } = accessResult;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    const visibleUserIds: string[] | null = rpcVisibleUserIds ?? null;

    let assignedAccountIds: string[] = [];
    if (!isOwner && hierarchyType === 'restricted' && visibleUserIds && visibleUserIds.length > 0) {
      const { data: assignments } = await (adminClient as any)
        .from('account_assignees')
        .select('account_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      assignedAccountIds = assignments?.map((a: any) => a.account_id) || [];
    }

    const { AccountsService } = await import('@kit/sales');
    const accountsService = new AccountsService(adminClient as any);

    const { data: sortedAccounts, count } = await accountsService.getAccountsList({
      workspaceId,
      page,
      limit,
      searchTerm,
      sortColumn,
      sortDirection,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      createdByIds,
      isOwner,
      visibleUserIds: visibleUserIds || undefined,
      assignedAccountIds,
    });

    return NextResponse.json({
      message: 'Accounts retrieved successfully',
      data: sortedAccounts,
      count: count || 0,
    });
  },
);

/**
 * POST /api/accounts
 * Create a new account
 */
export const createAccount = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const payload = await request.json();
    const { workspaceId, account_name, ...rest } = payload;

    if (!workspaceId || !account_name) {
      return NextResponse.json(
        { message: 'workspaceId and account_name are required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get default status for accounts if not provided
    let statusId = payload.status_id;
    if (!statusId) {
      const { data: status } = await supabase
        .from('entity_statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status_key', 'active') // Assuming active is default for accounts?
        // Actually accounts migration didn't seed specific keys like leads.
        // Let's just pick the first active one or is_default = true.
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      statusId = status?.id;

      if (!statusId) {
        // Fallback to any active status for this module if no default
        const { data: fallbackStatus } = await supabase
          .from('entity_statuses')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .limit(1)
          .single();

        statusId = fallbackStatus?.id;
      }
    }

    if (!statusId) {
      return NextResponse.json(
        {
          message:
            'No active status found for workspace. Please configure statuses.',
        },
        { status: 400 },
      );
    }

    // Clean rest payload to prevent UUID errors (convert empty strings to null)
    const cleanedData: Record<string, any> = {};
    Object.keys(rest).forEach((key) => {
      cleanedData[key] = rest[key] === '' ? null : rest[key];
    });

    const { data: account, error } = await supabase
      .from('crm_accounts')
      .insert({
        workspace_id: workspaceId,
        account_name,
        status_id: statusId,
        owner_id: user.id,
        created_by: user.id,
        ...cleanedData,
      })
      .select()
      .single();

    if (error) {
      console.error('Create account error:', error);
      throw error;
    }

    return successDataResponse('Account created successfully', account);
  },
);

/**
 * GET /api/accounts/types
 * Fetch all account types for a workspace (stored in entity_statuses for the accounts module)
 * Supports ?includeInactive=true to return all types (for management dialog)
 */
export const getAccountTypes = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: module, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'accounts')
      .single();

    if (moduleError || !module) {
      console.error('Get accounts module error:', moduleError);
      return NextResponse.json(
        { message: 'Failed to retrieve module information' },
        { status: 500 },
      );
    }

    let query = supabase
      .from('entity_statuses')
      .select('id, status_name, status_key, color, icon, is_system, is_closed, is_active, is_default, sort_order')
      .eq('workspace_id', workspaceId)
      .eq('module_id', module.id)
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: types, error } = await query;

    if (error) {
      console.error('Get account types error:', error);
      throw error;
    }

    return successDataResponse('Account types retrieved successfully', types || []);
  },
);

/**
 * GET /api/accounts/types/[id]/affected
 * Get count + first N accounts using this type (for pre-disable confirmation modal)
 */
export const getAffectedAccounts = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const typeId = params?.id;

    if (!workspaceId || !typeId) {
      return NextResponse.json(
        { message: 'workspaceId and type id are required' },
        { status: 400 },
      );
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: records, error, count } = await adminClient
      .from('crm_accounts')
      .select('id, account_name', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('account_type', typeId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get affected accounts error:', error);
      throw error;
    }

    const mapped = (records || []).map((r: any) => ({
      id: r.id,
      name: r.account_name,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return successDataResponse('Affected accounts retrieved successfully', {
      total_count: count ?? 0,
      records: mapped,
    });
  },
);

/**
 * PATCH /api/accounts/types/[id]/reassign
 * Bulk-reassign all accounts from old type to new type, then disable old type.
 * Body: { new_status_id: string, workspace_id: string }
 */
export const reassignAccountType = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const oldTypeId = params?.id;
    const body = await request.json();
    const { new_status_id, workspace_id } = body;

    if (!oldTypeId || !new_status_id || !workspace_id) {
      return NextResponse.json(
        { message: 'id, new_status_id, and workspace_id are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Validate new type is active and belongs to the same workspace
    const { data: newType } = await adminClient
      .from('entity_statuses')
      .select('id, is_active')
      .eq('id', new_status_id)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single();

    if (!newType) {
      return NextResponse.json(
        { message: 'New type not found or is not active' },
        { status: 400 },
      );
    }

    // Bulk update all affected accounts
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { count: reassignedCount, error: updateError } = await (adminClient as any)
      .from('crm_accounts')
      .update({ account_type: new_status_id, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .eq('account_type', oldTypeId)
      .eq('is_deleted', false);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (updateError) {
      console.error('Reassign accounts error:', updateError);
      throw updateError;
    }

    // Now disable the old type
    const { error: disableError } = await adminClient
      .from('entity_statuses')
      .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', oldTypeId);

    if (disableError) {
      console.error('Disable account type error:', disableError);
      throw disableError;
    }

    return successDataResponse('Accounts reassigned and type disabled successfully', {
      reassigned_count: reassignedCount ?? 0,
      disabled_status_id: oldTypeId,
    });
  },
);

/**
 * POST /api/accounts/types
 * Create a new account type
 */
export const createAccountType = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, status_name, color, icon, is_closed } = body;

    if (!workspace_id || !status_name) {
      return NextResponse.json(
        { message: 'workspace_id and status_name are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: moduleData, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'accounts')
      .single();

    if (moduleError || !moduleData) {
      console.error('Get accounts module error:', moduleError);
      return NextResponse.json(
        { message: 'Failed to retrieve module information' },
        { status: 500 },
      );
    }

    const status_key = status_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const { data: maxSort } = await supabase
      .from('entity_statuses')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .eq('module_id', moduleData.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: typeRecord, error } = await supabase
      .from('entity_statuses')
      .insert({
        workspace_id,
        module_id: moduleData.id,
        status_name: status_name.trim(),
        status_key,
        color: color || '#3B82F6',
        icon: icon || null,
        is_active: true,
        is_system: false,
        is_default: false,
        is_closed: !!is_closed,
        sort_order,
        created_by: user.id,
      })
      .select('id, status_name, status_key, color, icon, is_closed, is_system')
      .single();

    if (error) {
      console.error('Create account type error:', error);
      throw error;
    }

    return successDataResponse('Account type created successfully', typeRecord);
  },
);

/**
 * PATCH /api/accounts/types/[id]
 * Update an account type
 */
export const updateAccountType = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;
    const body = await request.json();
    const { status_name, color, icon, is_closed, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Account type id is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const updateData: any = {};
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (status_name !== undefined) {
      updateData.status_name = status_name.trim();
      updateData.status_key = status_name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (is_closed !== undefined) updateData.is_closed = is_closed;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    const { data: typeRecord, error } = await supabase
      .from('entity_statuses')
      .update(updateData)
      .eq('id', id)
      .select('id, status_name, status_key, color, icon, is_closed, is_system')
      .single();

    if (error) {
      console.error('Update account type error:', error);
      throw error;
    }

    return successDataResponse('Account type updated successfully', typeRecord);
  },
);

/**
 * DELETE /api/accounts/types/[id]
 * Delete an account type
 */
export const deleteAccountType = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'Account type id is required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('entity_statuses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete account type error:', error);
      throw error;
    }

    return successDataResponse('Account type deleted successfully', { id });
  },
);
