import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import { coreDb } from '~/lib/field-permission/core-client';
import { loadEntityFields } from '~/lib/field-permission/field-permission.server';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type FieldAccessMember = {
  member_type: 'role' | 'user';
  member_id: string;
  can_view?: boolean;
  can_edit?: boolean;
};

/**
 * GET /api/fields
 * Get all entity fields for a workspace
 */
const getFields = catchAsync(async (request: NextRequest) => {
  const supabase = getSupabaseServerClient<Database>();
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const entityType = url.searchParams.get('entityType');
  const productKey = url.searchParams.get('productKey') ?? 'sales';

  if (!workspaceId) {
    return NextResponse.json(
      { message: 'workspaceId is required' },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (entityType) {
    const fields = await loadEntityFields(
      supabase,
      workspaceId,
      entityType,
      productKey,
    );
    return successDataResponse('Fields retrieved successfully', fields);
  }

  let query = coreDb(supabase)
    .from('entity_fields')
    .select(
      `
        *,
        access_rule:field_access_rules(*),
        access_members:field_access_members(
          id,
          member_type,
          member_id,
          can_view,
          can_edit
        )
      `,
    )
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data: fields, error } = await query;

  if (error) {
    console.error('Get fields error:', error);
    throw error;
  }

  return successDataResponse('Fields retrieved successfully', fields);
});

/**
 * POST /api/fields
 * Create a new entity field
 */
const createField = catchAsync(async (request: NextRequest) => {
  const supabase = getSupabaseServerClient<Database>();
  const body = await request.json();

  const {
    workspace_id,
    entity_type,
    field_key,
    field_label,
    field_type,
    description,
    is_required,
    is_system,
    display_order,
    settings,
    access_type,
    access_members,
    created_by,
    product_key,
  } = body;

  // Validate required fields
  if (
    !workspace_id ||
    !entity_type ||
    !field_key ||
    !field_label ||
    !field_type
  ) {
    return NextResponse.json(
      {
        message:
          'workspace_id, entity_type, field_key, field_label, and field_type are required',
      },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = getSupabaseServerAdminClient<Database>();
  const coreAdmin = coreDb(adminSupabase);

  // Check if user has admin permissions using the service-role client so current
  // user auth is validated separately, while workspace membership lookups are
  // not blocked by RLS on public tables.
  const { data: members, error: memberError } = await adminSupabase
    .from('workspace_members')
    .select('role_id, product_key')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id);

  if (memberError || !members || members.length === 0) {
    return NextResponse.json(
      { message: 'User is not a member of this workspace' },
      { status: 403 },
    );
  }

  const member = members.find((m: any) => m.product_key === null) || members[0];

  if (memberError || !member) {
    return NextResponse.json(
      { message: 'User is not a member of this workspace' },
      { status: 403 },
    );
  }

  const { data: role, error: roleError } = await adminSupabase
    .from('workspace_roles')
    .select('role_key')
    .eq('id', member.role_id)
    .eq('workspace_id', workspace_id)
    .single();

  if (roleError || !role) {
    return NextResponse.json(
      { message: 'User role could not be resolved' },
      { status: 403 },
    );
  }

  const isAdminUser = role.role_key === 'admin' || role.role_key === 'owner';
  if (!isAdminUser && access_type !== 'public' && access_type !== 'private') {
    return NextResponse.json(
      {
        message:
          'Only admins can create role-based or user-based field access. Team members can create public or private fields only.',
      },
      { status: 403 },
    );
  }

  if (!isAdminUser && access_members && access_members.length > 0) {
    return NextResponse.json(
      {
        message:
          'Only admins can assign specific access members. Team members can create public or private fields only.',
      },
      { status: 403 },
    );
  }

  const { data: field, error: fieldError } = await coreAdmin
    .from('entity_fields')
    .insert({
      workspace_id,
      entity_type,
      field_key,
      field_label,
      field_type,
      description,
      is_required: is_required ?? false,
      is_system: is_system ?? false,
      is_active: true,
      display_order: display_order ?? 0,
      settings: settings ?? {},
      created_by: created_by ?? user.id,
      product_key: product_key ?? 'sales',
    })
    .select()
    .single();

  if (fieldError) {
    console.error('Create field error:', fieldError);
    return NextResponse.json(
      { message: 'Failed to create field' },
      { status: 500 },
    );
  }

  // Create access rule if custom access is specified
  if (access_type && access_type !== 'public') {
    const { data: accessRule, error: accessRuleError } = await coreAdmin
      .from('field_access_rules')
      .insert({
        workspace_id,
        field_id: field.id,
        access_type,
      })
      .select()
      .single();

    if (accessRuleError) {
      console.error('Create access rule error:', accessRuleError);
      // Rollback field creation
      await coreAdmin.from('entity_fields').delete().eq('id', field.id);
      throw accessRuleError;
    }

    const creatorAccessMember =
      !isAdminUser && access_type === 'private'
        ? [
            {
              workspace_id,
              field_access_rule_id: accessRule.id,
              member_type: 'user' as const,
              member_id: user.id,
              can_view: true,
              can_edit: true,
            },
          ]
        : [];

    const memberInserts = [
      ...creatorAccessMember,
      ...(access_members && access_members.length > 0
        ? access_members.map((member: FieldAccessMember) => ({
            workspace_id,
            field_access_rule_id: accessRule.id,
            member_type: member.member_type,
            member_id: member.member_id,
            can_view: member.can_view ?? true,
            can_edit: member.can_edit ?? false,
          }))
        : []),
    ];

    if (memberInserts.length > 0) {
      const { error: membersError } = await coreAdmin
        .from('field_access_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Create access members error:', membersError);
        // Rollback
        await coreAdmin
          .from('field_access_rules')
          .delete()
          .eq('id', accessRule.id);
        await coreAdmin.from('entity_fields').delete().eq('id', field.id);
        throw membersError;
      }
    }
  }

  return successDataResponse('Field created successfully', field);
});

/**
 * PATCH /api/fields
 * Update an existing entity field
 */
const updateField = catchAsync(async (request: NextRequest) => {
  const supabase = getSupabaseServerClient<Database>();
  const body = await request.json();

  const { id, updates, access_type, access_members } = body;

  if (!id) {
    return NextResponse.json(
      { message: 'field id is required' },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = getSupabaseServerAdminClient<Database>();
  const coreAdmin = coreDb(adminSupabase);

  // Get the field to check workspace
  const { data: existingField, error: fieldError } = await coreAdmin
    .from('entity_fields')
    .select('workspace_id, is_system')
    .eq('id', id)
    .single();

  if (fieldError || !existingField) {
    return NextResponse.json({ message: 'Field not found' }, { status: 404 });
  }

  // Check if user has admin permissions
  const { data: members, error: memberError } = await supabase
    .from('workspace_members')
    .select('role_id, product_key')
    .eq('workspace_id', existingField.workspace_id)
    .eq('user_id', user.id);

  if (memberError || !members || members.length === 0) {
    return NextResponse.json(
      { message: 'User is not a member of this workspace' },
      { status: 403 },
    );
  }

  const member = members.find((m: any) => m.product_key === null) || members[0];

  if (memberError || !member) {
    return NextResponse.json(
      { message: 'User is not a member of this workspace' },
      { status: 403 },
    );
  }

  const { data: role, error: roleError } = await supabase
    .from('workspace_roles')
    .select('role_key')
    .eq('id', member.role_id)
    .eq('workspace_id', existingField.workspace_id)
    .single();

  if (
    roleError ||
    !role ||
    (role.role_key !== 'admin' && role.role_key !== 'owner')
  ) {
    return NextResponse.json(
      { message: 'Only admins can update fields' },
      { status: 403 },
    );
  }

  // Don't allow updating system fields
  if (existingField.is_system) {
    return NextResponse.json(
      { message: 'System fields cannot be updated' },
      { status: 403 },
    );
  }

  // Update field
  const { data: updatedField, error: updateError } = await coreAdmin
    .from('entity_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Update field error:', updateError);
    throw updateError;
  }

  // Update access rules if access_type is provided
  if (access_type !== undefined) {
    const { data: accessRule } = await coreAdmin
      .from('field_access_rules')
      .select('id')
      .eq('field_id', id)
      .maybeSingle();

    if (accessRule) {
      // Update existing access rule
      await coreAdmin
        .from('field_access_rules')
        .update({ access_type })
        .eq('id', accessRule.id);
    } else if (access_type !== 'public') {
      // Create new access rule
      const { error: newAccessRuleError } = await coreAdmin
        .from('field_access_rules')
        .insert({
          workspace_id: existingField.workspace_id,
          field_id: id,
          access_type,
        })
        .select()
        .single();

      if (newAccessRuleError) {
        console.error('Create access rule error:', newAccessRuleError);
        throw newAccessRuleError;
      }
    }

    // Update access members if provided
    if (access_members !== undefined) {
      // Delete existing members
      await coreAdmin
        .from('field_access_members')
        .delete()
        .in(
          'field_access_rule_id',
          coreAdmin
            .from('field_access_rules')
            .select('id')
            .eq('field_id', id)
            .limit(1),
        );

      // Insert new members
      if (access_members.length > 0) {
        const fieldAccessRuleId =
          accessRule?.id ||
          (
            await coreAdmin
              .from('field_access_rules')
              .select('id')
              .eq('field_id', id)
              .single()
          ).data?.id;

        const memberInserts = access_members.map(
          (member: FieldAccessMember) => ({
            workspace_id: existingField.workspace_id,
            field_access_rule_id: fieldAccessRuleId,
            member_type: member.member_type,
            member_id: member.member_id,
            can_view: member.can_view ?? true,
            can_edit: member.can_edit ?? false,
          }),
        );

        await coreAdmin.from('field_access_members').insert(memberInserts);
      }
    }
  }

  return successDataResponse('Field updated successfully', updatedField);
});

/**
 * DELETE /api/fields
 * Delete an entity field
 */
const deleteField = catchAsync(async (request: NextRequest) => {
  const supabase = getSupabaseServerClient<Database>();
  const body = await request.json();

  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { message: 'ids array is required' },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = getSupabaseServerAdminClient<Database>();
  const coreAdmin = coreDb(adminSupabase);

  // Get fields to check workspace and if they are system fields
  const { data: existingFields, error: fieldsError } = await coreAdmin
    .from('entity_fields')
    .select('id, workspace_id, is_system')
    .in('id', ids);

  if (fieldsError) {
    console.error('Get fields error:', fieldsError);
    throw fieldsError;
  }

  // Check if any system fields are being deleted
  const systemFields = existingFields?.filter((f) => f.is_system);
  if (systemFields && systemFields.length > 0) {
    return NextResponse.json(
      { message: 'System fields cannot be deleted' },
      { status: 403 },
    );
  }

  // Check if user has admin permissions for each workspace
  const workspaceIds = [
    ...new Set(existingFields?.map((f) => f.workspace_id) || []),
  ];
  for (const workspaceId of workspaceIds) {
    const { data: members, error: memberError } = await supabase
      .from('workspace_members')
      .select('role_id, product_key')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (memberError || !members || members.length === 0) {
      return NextResponse.json(
        { message: `User is not a member of workspace ${workspaceId}` },
        { status: 403 },
      );
    }

    const member = members.find((m: any) => m.product_key === null) || members[0];

    if (memberError || !member) {
      return NextResponse.json(
        { message: `User is not a member of workspace ${workspaceId}` },
        { status: 403 },
      );
    }

    const { data: role, error: roleError } = await supabase
      .from('workspace_roles')
      .select('role_key')
      .eq('id', member.role_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (
      roleError ||
      !role ||
      (role.role_key !== 'admin' && role.role_key !== 'owner')
    ) {
      return NextResponse.json(
        {
          message: `Only admins can delete fields in workspace ${workspaceId}`,
        },
        { status: 403 },
      );
    }
  }

  // Delete fields
  const { error: deleteError } = await coreAdmin
    .from('entity_fields')
    .in('id', ids)
    .delete();

  if (deleteError) {
    console.error('Delete fields error:', deleteError);
    throw deleteError;
  }

  return successDataResponse('Fields deleted successfully');
});

export const GET = getFields;
export const POST = createField;
export const PATCH = updateField;
export const DELETE = deleteField;
