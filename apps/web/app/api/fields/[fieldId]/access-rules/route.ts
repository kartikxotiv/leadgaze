import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { coreDb } from '~/lib/field-permission/core-client';
import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

/**
 * GET /api/fields/[fieldId]/access-rules
 * Get access rules for a specific field
 */
const getAccessRules = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient<Database>();
    const fieldId = params?.fieldId;

    if (!fieldId) {
      return NextResponse.json(
        { message: 'fieldId is required' },
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

    // Get field to check workspace
    const { data: field, error: fieldError } = await coreDb(supabase)
      .from('entity_fields')
      .select('workspace_id')
      .eq('id', fieldId)
      .single();

    if (fieldError || !field) {
      return NextResponse.json(
        { message: 'Field not found' },
        { status: 404 },
      );
    }

    // Check if user has access to this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role_id')
      .eq('workspace_id', field.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { message: 'User is not a member of this workspace' },
        { status: 403 },
      );
    }

    // Get access rule and members
    const { data: accessRule, error: accessRuleError } = await coreDb(supabase)
      .from('field_access_rules')
      .select(
        `
        *,
        members:field_access_members(
          id,
          member_type,
          member_id,
          can_view,
          can_edit
        )
      `,
      )
      .eq('field_id', fieldId)
      .maybeSingle();

    if (accessRuleError) {
      console.error('Get access rule error:', accessRuleError);
      throw accessRuleError;
    }

    return successDataResponse('Access rules retrieved successfully', accessRule);
  },
);

/**
 * POST /api/fields/[fieldId]/access-rules
 * Create or update access rules for a field
 */
const upsertAccessRules = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient<Database>();
    const fieldId = params?.fieldId;
    const body = await request.json();

    const { access_type, access_members } = body;

    if (!fieldId) {
      return NextResponse.json(
        { message: 'fieldId is required' },
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

    // Get field to check workspace
    const { data: field, error: fieldError } = await coreDb(supabase)
      .from('entity_fields')
      .select('workspace_id, is_system')
      .eq('id', fieldId)
      .single();

    if (fieldError || !field) {
      return NextResponse.json(
        { message: 'Field not found' },
        { status: 404 },
      );
    }

    // Check if user has admin permissions
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role_id')
      .eq('workspace_id', field.workspace_id)
      .eq('user_id', user.id)
      .single();

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
      .eq('workspace_id', field.workspace_id)
      .single();

    if (roleError || !role || (role.role_key !== 'admin' && role.role_key !== 'owner')) {
      return NextResponse.json(
        { message: 'Only admins can update field access rules' },
        { status: 403 },
      );
    }

    // Don't allow updating system fields
    if (field.is_system) {
      return NextResponse.json(
        { message: 'System fields cannot be updated' },
        { status: 403 },
      );
    }

    // Start a transaction
    const { data: accessRule, error: accessRuleError } = await coreDb(supabase)
      .from('field_access_rules')
      .upsert({
        workspace_id: field.workspace_id,
        field_id: fieldId,
        access_type,
      })
      .select()
      .single();

    if (accessRuleError) {
      console.error('Upsert access rule error:', accessRuleError);
      throw accessRuleError;
    }

    // Delete existing members
    await coreDb(supabase)
      .from('field_access_members')
      .delete()
      .eq('field_access_rule_id', accessRule.id);

    // Insert new members
    if (access_members && access_members.length > 0) {
      const memberInserts = access_members.map((member: Database['core']['Tables']['field_access_members']['Insert']) => ({
        workspace_id: field.workspace_id,
        field_access_rule_id: accessRule.id,
        member_type: member.member_type,
        member_id: member.member_id,
        can_view: member.can_view ?? true,
        can_edit: member.can_edit ?? false,
      }));

      const { error: membersError } = await coreDb(supabase)
        .from('field_access_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Insert access members error:', membersError);
        throw membersError;
      }
    }

    return successDataResponse('Access rules updated successfully', accessRule);
  },
);

export { getAccessRules, upsertAccessRules };
