import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

// Direct columns: sorted at DB level
const ACCOUNT_DIRECT_SORT_COLUMNS: Record<string, string> = {
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
};

// Relational columns: sorted in Node.js after fetch.
// Supabase's foreignTable in .order() only sorts nested children, NOT parent rows.
const ACCOUNT_RELATIONAL_SORT_COLUMNS: Record<string, string> = {
  'industry.industry_name':      'industry.industry_name',
  'owner.name':                  'owner.name',
  'created_by_account.name':     'created_by_account.name',
  'updated_by_account.name':     'updated_by_account.name',
};

const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value.toLowerCase() : '';
};

/**
 * GET /api/accounts
 * Fetch all accounts for a workspace
 * Optimized: uses resolve_workspace_access RPC (1 DB call) instead of 5-8 sequential auth/hierarchy queries.
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

    // Single RPC call replaces: workspace owner check, membership check,
    // and 3-5 queries inside getHierarchyVisibleUserIds
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: true,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
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

    // Build the query
    let query = adminClient
      .from('crm_accounts')
      .select(
        `
          *,
          status:entity_statuses!crm_accounts_status_id_fkey(id, status_name, status_key, color, icon),
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_accounts_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_accounts_updated_by_fkey(id, email, name),
          industry:crm_industries(id, industry_name),
          account_type_relation:entity_statuses!entity_statuses_account_type_fkey(id, status_name, status_key, color, icon)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
    if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
    if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
    if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

    if (createdByIds && createdByIds !== 'all') {
      const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 1) {
        query = query.eq('created_by', ids[0]);
      } else if (ids.length > 1) {
        query = query.in('created_by', ids);
      }
    }

    // Apply hierarchy-based visibility filtering
    if (
      !isOwner &&
      hierarchyType === 'restricted' &&
      visibleUserIds &&
      visibleUserIds.length > 0
    ) {
      // Fetch assigned accounts for this user (only active assignments)
      const { data: assignments } = await adminClient
        .from('account_assignees')
        .select('account_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      const assignedIds = assignments?.map((a) => a.account_id) || [];
      const assignedIdsFilter =
        assignedIds.length > 0 ? `,id.in.(${assignedIds.join(',')})` : '';

      query = query.or(
        `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})${assignedIdsFilter}`,
      );
    }

    // Search term
    if (searchTerm) {
      query = query.or(
        `account_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`,
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const isRelationalSort = !!ACCOUNT_RELATIONAL_SORT_COLUMNS[sortColumn];
    const isDirectSort = !!ACCOUNT_DIRECT_SORT_COLUMNS[sortColumn];

    let finalQuery;
    if (isDirectSort) {
      finalQuery = query
        .order(ACCOUNT_DIRECT_SORT_COLUMNS[sortColumn]!, {
          ascending: sortDirection === 'asc',
          nullsFirst: false,
        })
        .range(from, to);
    } else if (isRelationalSort) {
      // Fetch all rows so we can sort in Node.js, then slice
      finalQuery = query.order('created_at', { ascending: false });
    } else {
      finalQuery = query.order('created_at', { ascending: false }).range(from, to);
    }

    const { data: accountsRaw, error, count } = await finalQuery;

    if (error) {
      console.error('Get accounts error:', error);
      throw error;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let sortedAccounts: any[] = accountsRaw || [];
    if (isRelationalSort && ACCOUNT_RELATIONAL_SORT_COLUMNS[sortColumn]) {
      const accessor = ACCOUNT_RELATIONAL_SORT_COLUMNS[sortColumn]!;
      const ascending = sortDirection === 'asc';
      sortedAccounts = [...sortedAccounts].sort((a, b) => {
        const aVal = getNestedValue(a, accessor);
        const bVal = getNestedValue(b, accessor);
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
      sortedAccounts = sortedAccounts.slice(from, to + 1);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

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

    const { data: types, error } = await supabase
      .from('entity_statuses')
      .select('id, status_name, status_key, color, icon, is_system, is_closed')
      .eq('workspace_id', workspaceId)
      .eq('module_id', module.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Get account types error:', error);
      throw error;
    }

    return successDataResponse('Account types retrieved successfully', types || []);
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
