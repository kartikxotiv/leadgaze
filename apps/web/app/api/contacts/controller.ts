import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

// Direct columns: sorted at DB level
const CONTACT_DIRECT_SORT_COLUMNS: Record<string, string> = {
  first_name:  'first_name',
  last_name:   'last_name',
  email:       'email',
  job_title:   'job_title',
  created_at:  'created_at',
};

// Relational columns: sorted in Node.js after fetch.
// Supabase's foreignTable in .order() only sorts nested children, NOT parent rows.
const CONTACT_RELATIONAL_SORT_COLUMNS: Record<string, string> = {
  'account.account_name':    'account.account_name',
  'owner.name':              'owner.name',
  'created_by_account.name': 'created_by_account.name',
  'updated_by_account.name': 'updated_by_account.name',
};

const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value.toLowerCase() : '';
};

/**
 * GET /api/contacts
 * Fetch all contacts for a workspace
 * Optimized: uses resolve_workspace_access RPC (1 DB call) instead of 5-8 sequential auth/hierarchy queries.
 * Search pre-queries (account name + name match) run in parallel via Promise.all.
 */
export const getContacts = catchAsync(
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
    const accountId = url.searchParams.get('accountId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const sortColumn = url.searchParams.get('sortColumn') || '';
    const sortDirection = url.searchParams.get('sortDirection') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

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
      p_require_shared_team: true, // contacts use default requireSharedTeam
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
      .from('crm_contacts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_contacts_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_contacts_updated_by_fkey(id, email, name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
    if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
    if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
    if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

    // Apply hierarchy-based visibility filtering
    if (
      !isOwner &&
      hierarchyType === 'restricted' &&
      visibleUserIds &&
      visibleUserIds.length > 0
    ) {
      // Fetch assigned contacts for this user (only active assignments)
      const { data: assignments } = await adminClient
        .from('contact_assignees')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      const assignedIds = assignments?.map((a) => a.contact_id) || [];
      const assignedIdsFilter =
        assignedIds.length > 0 ? `,id.in.(${assignedIds.join(',')})` : '';

      query = query.or(
        `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})${assignedIdsFilter}`,
      );
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Search term - run account name search and name-match in parallel
    if (searchTerm) {
      const parts = searchTerm.split(' ').filter(Boolean);

      // Build name-match promise (if multi-part search)
      /* eslint-disable @typescript-eslint/no-explicit-any */
      let nameSearchPromise: Promise<any> | null = null;
      if (parts.length >= 2) {
        const conditions: string[] = [];
        for (let i = 1; i < parts.length; i++) {
          const part1 = parts.slice(0, i).join(' ');
          const part2 = parts.slice(i).join(' ');
          conditions.push(
            `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%)`,
          );
          conditions.push(
            `and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`,
          );
        }
        nameSearchPromise = adminClient
          .from('crm_contacts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(conditions.join(',')) as unknown as Promise<any>;
      }

      // Run account search and name-match in parallel
      const results = await Promise.all([
        adminClient
          .from('crm_accounts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .ilike('account_name', `%${searchTerm}%`),
        ...(nameSearchPromise ? [nameSearchPromise] : []),
      ]);

      const matchedAccounts = results[0].data;
      const accountIds = matchedAccounts?.map((a) => a.id) || [];

      let orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`;

      if (accountIds.length > 0) {
        orFilter += `,account_id.in.(${accountIds.join(',')})`;
      }

      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (nameSearchPromise && results.length > 1) {
        const nameMatched = (results[1] as any).data;
        const matchedIds = nameMatched?.map((c: any) => c.id) || [];
        if (matchedIds.length > 0) {
          orFilter += `,id.in.(${matchedIds.join(',')})`;
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */

      query = query.or(orFilter);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const isRelationalSort = !!CONTACT_RELATIONAL_SORT_COLUMNS[sortColumn];
    const isDirectSort = !!CONTACT_DIRECT_SORT_COLUMNS[sortColumn];

    let finalQuery;
    if (isDirectSort) {
      finalQuery = query
        .order(CONTACT_DIRECT_SORT_COLUMNS[sortColumn]!, {
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

    const { data: contactsRaw, error, count } = await finalQuery;

    if (error) {
      console.error('Get contacts error:', error);
      throw error;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let sortedContacts: any[] = contactsRaw || [];
    if (isRelationalSort && CONTACT_RELATIONAL_SORT_COLUMNS[sortColumn]) {
      const accessor = CONTACT_RELATIONAL_SORT_COLUMNS[sortColumn]!;
      const ascending = sortDirection === 'asc';
      sortedContacts = [...sortedContacts].sort((a, b) => {
        const aVal = getNestedValue(a, accessor);
        const bVal = getNestedValue(b, accessor);
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
      sortedContacts = sortedContacts.slice(from, to + 1);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      message: 'Contacts retrieved successfully',
      data: sortedContacts,
      count: count || 0,
    });
  },
);

/**
 * POST /api/contacts
 * Create a new contact
 */
export const createContact = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const payload = await request.json();
    const { workspaceId, first_name, ...rest } = payload;

    if (!workspaceId || !first_name) {
      return NextResponse.json(
        { message: 'workspaceId and first_name are required' },
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

    // Get default status for contacts if not provided
    let statusId = payload.status_id;
    if (!statusId) {
      const { data: status } = await supabase
        .from('entity_statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status_key', 'new') // In leads migration we seeded 'new'.
        // For contacts, let's look for is_default = true first.
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      statusId = status?.id;

      if (!statusId) {
        // Fallback to any active status
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

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .insert({
        workspace_id: workspaceId,
        first_name,
        status_id: statusId,
        owner_id: payload.owner_id || user.id,
        created_by: user.id,
        ...cleanedData,
      })
      .select()
      .single();

    if (error) {
      console.error('Create contact error:', error);
      throw error;
    }

    return successDataResponse('Contact created successfully', contact);
  },
);
