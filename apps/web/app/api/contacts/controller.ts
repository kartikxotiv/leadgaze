import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

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
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner = workspace?.owner_id === user.id;

    // Build the query
    let query = supabase
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

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Search term
    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
      );
    }

    // If not owner, filter for public contacts, contacts assigned to current user, or contacts created by current user
    if (!isOwner) {
      // Get contacts assigned to the current user
      const { data: assignedContactIds } = await (supabase
        .from('contact_assignees' as any)
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedContactIds?.map((a: any) => a.contact_id) || [];

      // Filter: public contacts OR assigned contacts OR created by current user
      query = query.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
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
        is_public: payload.is_public ?? true, // Default to public
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
