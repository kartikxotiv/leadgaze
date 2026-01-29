import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type AccountAssignee = Database['public']['Tables']['account_assignees']['Row'];

/**
 * GET /api/accounts/[id]/assignees
 * Get all assignees for an account
 */
const getAccountAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const accountId = params?.id;

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await (supabase
      .from('account_assignees_with_details' as any)
      .select('*')
      .eq('account_id', accountId)
      .eq('assignment_status', 'active')
      .order('assigned_at', { ascending: true }) as any);

    if (error) {
      console.error('Get assignees error:', error);
      throw error;
    }

    return successDataResponse(
      'Assignees retrieved successfully',
      assignees || [],
    );
  },
);

/**
 * POST /api/accounts/[id]/assignees
 * Assign a user to an account
 */
const assignAccountToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const accountId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 },
      );
    }

    if (!assigned_to_user_id) {
      return NextResponse.json(
        { message: 'assigned_to_user_id is required' },
        { status: 400 },
      );
    }

    // Get the account to verify it exists and get workspace_id
    const { data: account, error: accountError } = await supabase
      .from('crm_accounts')
      .select('id, workspace_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await (supabase
      .from('account_assignees' as any)
      .select('id')
      .eq('account_id', accountId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .single() as any);

    if (existingAssignment) {
      return NextResponse.json(
        { message: 'User is already assigned to this account' },
        { status: 409 },
      );
    }

    // Get current user for audit trail
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Insert new assignment
    const { data: assignee, error: insertError } = await (supabase
      .from('account_assignees' as any)
      .insert({
        account_id: accountId,
        assigned_to_user_id,
        workspace_id: account.workspace_id,
        assigned_by: user.id,
        created_by: user.id,
        assignment_status: 'active',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single() as any);

    if (insertError) {
      console.error('Assign user error:', insertError);
      throw insertError;
    }

    // Return with full details
    const { data: fullAssignee } = await (supabase
      .from('account_assignees_with_details' as any)
      .select('*')
      .eq('id', assignee.id)
      .single() as any);

    return NextResponse.json(
      {
        message: 'User assigned to account successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/accounts/[id]/assignees/[assigneeId]
 * Unassign a user from an account
 */
const unassignAccountFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: accountId, assigneeId } = params || {};

    if (!accountId || !assigneeId) {
      return NextResponse.json(
        { message: 'Account ID and Assignee ID are required' },
        { status: 400 },
      );
    }

    // Get current user for audit trail
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete by setting status to inactive
    const { error: updateError } = await (supabase
      .from('account_assignees' as any)
      .update({
        assignment_status: 'inactive',
        unassigned_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assigneeId)
      .eq('account_id', accountId) as any);

    if (updateError) {
      console.error('Unassign user error:', updateError);
      throw updateError;
    }

    return successDataResponse('User unassigned from account successfully');
  },
);

export { getAccountAssignees, assignAccountToUser, unassignAccountFromUser };
