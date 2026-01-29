import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/contacts/[id]
 * Fetch a single contact by ID
 */
export const getContactById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 },
      );
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name)
        `,
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Get contact error:', error);
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 },
      );
    }

    return successDataResponse('Contact retrieved successfully', contact);
  },
);

/**
 * PATCH /api/contacts/[id]
 * Update a contact
 */
export const updateContact = catchAsync(
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

    if (!id) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
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

    // Check permissions for is_public updates
    if (body.is_public !== undefined) {
      // Get the contact to check permissions
      const { data: existingContact } = await supabase
        .from('crm_contacts')
        .select('workspace_id, created_by')
        .eq('id', id)
        .single();

      if (existingContact) {
        // Get workspace to check if user is owner
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', existingContact.workspace_id)
          .single();

        const isWorkspaceOwner = workspace?.owner_id === user.id;
        const isCreator = existingContact.created_by === user.id;

        if (!isWorkspaceOwner && !isCreator) {
          return NextResponse.json(
            { message: 'Only workspace owner or creator can change visibility' },
            { status: 403 },
          );
        }
      }
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update contact error:', error);
      throw error;
    }

    return successDataResponse('Contact updated successfully', contact);
  },
);
