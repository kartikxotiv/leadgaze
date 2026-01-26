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

    // Build the query
    // Join with Accounts to get company name? Yes usually helpful.
    // Join with Status.
    // Join with Owner.
    let query = supabase
      .from('crm_contacts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name)
        `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data: contacts, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Get contacts error:', error);
      throw error;
    }

    return successDataResponse(
      'Contacts retrieved successfully',
      contacts || [],
    );
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
