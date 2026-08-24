import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';
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
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_contacts_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_contacts_updated_by_fkey(id, email, name)
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

    // Get the contact to check permissions
    const { data: existingContact } = await supabase
      .from('crm_contacts')
      .select('workspace_id, owner_id, created_by')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existingContact) {
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 },
      );
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingContact.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingContact.owner_id === user.id;
    const isCreator = existingContact.created_by === user.id;

    // Check general edit permission
    let hasEditPermission = isWorkspaceOwner || isOwner || isCreator;

    if (!hasEditPermission) {
      const { data: members } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('user_id', user.id)
        .eq('workspace_id', existingContact.workspace_id);

      const member =
        members?.find((m: any) => m.product_key === 'sales') ||
        members?.find((m: any) => m.product_key === null) ||
        members?.[0];

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'edit')
          .eq('crm_module_features.crm_modules.module_key', 'contacts')
          .single();

        if (permission?.can_access) {
          hasEditPermission = true;
        }
      }
    }

    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to edit this contact' },
        { status: 403 },
      );
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .update({
        ...body,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
        *,
        status:entity_statuses(id, status_name, status_key, color, icon),
        account:crm_accounts(id, account_name),
        owner:accounts!crm_contacts_owner_id_fkey(id, email, name),
        created_by_account:accounts!crm_contacts_created_by_fkey(id, email, name),
        updated_by_account:accounts!crm_contacts_updated_by_fkey(id, email, name)
      `,
      )
      .single();

    if (error) {
      console.error('Update contact error:', error);
      throw error;
    }

    return successDataResponse('Contact updated successfully', contact);
  },
);

/**
 * DELETE /api/contacts/[id]
 * Soft delete a contact
 */
export const deleteContact = catchAsync(
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

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    // Get the active contact so repeated deletes cannot release usage twice.
    const { data: existingContact } = await supabase
      .from('crm_contacts')
      .select('workspace_id, owner_id, created_by')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (!existingContact) {
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 },
      );
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingContact.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingContact.owner_id === user.id;
    let hasPermission = isWorkspaceOwner || isOwner;

    // If not owner, check RBAC permissions
    if (!hasPermission) {
      const { data: members } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('user_id', user.id)
        .eq('workspace_id', existingContact.workspace_id);

      const member =
        members?.find((m: any) => m.product_key === 'sales') ||
        members?.find((m: any) => m.product_key === null) ||
        members?.[0];

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'delete')
          .eq('crm_module_features.crm_modules.module_key', 'contacts')
          .single();

        if (permission?.can_access) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this contact' },
        { status: 403 },
      );
    }

    // Soft delete contact
    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Delete contact error:', error);
      throw error;
    }

    await createEntitlementService().releaseUsage({
      workspaceId: existingContact.workspace_id,
      moduleKey: 'sales',
      featureKey: 'sales.contacts',
      resourceId: id,
      resourceType: 'contact',
    });

    return successDataResponse('Contact deleted successfully', contact);
  },
);
