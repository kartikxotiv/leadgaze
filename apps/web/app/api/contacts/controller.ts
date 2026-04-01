import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import { getHierarchyVisibleUserIds } from '../../../lib/permissions/hierarchy-utils';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/contacts
 * Fetch all contacts for a workspace
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

    // Check permissions (Workspace Access)
    const { data: workspace, error: workspaceError } = await adminClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner = workspace?.owner_id === user.id;

    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!isOwner && !membership) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    // Build the query
    let query = adminClient
      .from('crm_contacts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_contacts_created_by_fkey(id, email, name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // Apply hierarchy-based visibility filtering.
    // Workspace owners bypass all hierarchy restrictions.
    if (!isOwner) {
      const hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        user.id,
      );
      if (hierarchyFilter.type === 'restricted') {
        const userIds = hierarchyFilter.userIds;

        // Fetch assigned contacts for this user (only active assignments)
        const { data: assignments } = await adminClient
          .from('contact_assignees')
          .select('contact_id')
          .eq('workspace_id', workspaceId)
          .eq('assigned_to_user_id', user.id)
          .eq('assignment_status', 'active');

        const assignedIds = assignments?.map((a) => a.contact_id) || [];
        const assignedIdsFilter = assignedIds.length > 0 
          ? `,id.in.(${assignedIds.join(',')})` 
          : '';

        query = query.or(`owner_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})${assignedIdsFilter}`);
      }
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Search term
    if (searchTerm) {
      // First, find accounts that match the search term in this workspace
      const { data: matchedAccounts } = await adminClient
        .from('crm_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('account_name', `%${searchTerm}%`);

      const accountIds = matchedAccounts?.map((a) => a.id) || [];

      let orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`;

      if (accountIds.length > 0) {
        orFilter += `,account_id.in.(${accountIds.join(',')})`;
      }

      // Full name search logic - try multiple splits and combinations
      const parts = searchTerm.split(' ').filter(Boolean);
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

        const { data: nameMatched } = await adminClient
          .from('crm_contacts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(conditions.join(','));

        const matchedIds = nameMatched?.map((c) => c.id) || [];
        if (matchedIds.length > 0) {
          orFilter += `,id.in.(${matchedIds.join(',')})`;
        }
      }

      query = query.or(orFilter);
    }
  



    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: contacts,
      error,
      count,
    } = await query
      .order('created_at', {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error('Get contacts error:', error);
      throw error;
    }

    if (error) {
      console.error('Get contacts error:', error);
      throw error;
    }

    return NextResponse.json({
      message: 'Contacts retrieved successfully',
      data: contacts || [],
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
