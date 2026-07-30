import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type OpportunityAssignee = Database['public']['Tables']['opportunity_assignees']['Row'];

/**
 * GET /api/opportunities/[id]/assignees
 * Get all assignees for an opportunity
 */
const getOpportunityAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const opportunityId = params?.id;

    if (!opportunityId) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await (supabase
      .from('opportunity_assignees_with_details' as any)
      .select('*')
      .eq('opportunity_id', opportunityId)
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
 * POST /api/opportunities/[id]/assignees
 * Assign a user to an opportunity
 */
const assignOpportunityToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const opportunityId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!opportunityId) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    if (!assigned_to_user_id) {
      return NextResponse.json(
        { message: 'assigned_to_user_id is required' },
        { status: 400 },
      );
    }

    // Get the opportunity to verify it exists and get workspace_id
    const { data: opportunity, error: opportunityError } = await supabase
      .from('crm_opportunities')
      .select('id, workspace_id')
      .eq('id', opportunityId)
      .single();

    if (opportunityError || !opportunity) {
      return NextResponse.json({ message: 'Opportunity not found' }, { status: 404 });
    }

    // Check if an active assignment already exists
    const { data: existingActive } = await (supabase
      .from('opportunity_assignees' as any)
      .select('id')
      .eq('opportunity_id', opportunityId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .single() as any);

    if (existingActive) {
      return NextResponse.json(
        { message: 'User is already assigned to this opportunity' },
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

    // Check if an inactive assignment exists - reactivate it instead of inserting
    const { data: existingInactive } = await (supabase
      .from('opportunity_assignees' as any)
      .select('id')
      .eq('opportunity_id', opportunityId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'inactive')
      .single() as any);

    const adminClient = getSupabaseServerAdminClient();

    let assigneeId: string;

    if (existingInactive) {
      const { data: reactivated, error: reactivateError } = await (adminClient
        .from('opportunity_assignees' as any)
        .update({
          assignment_status: 'active',
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          unassigned_at: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInactive.id)
        .select()
        .single() as any);

      if (reactivateError) {
        console.error('Reactivate assignment error:', reactivateError);
        throw reactivateError;
      }
      assigneeId = reactivated.id;
    } else {
      const { data: assignee, error: insertError } = await (adminClient
        .from('opportunity_assignees' as any)
        .insert({
          opportunity_id: opportunityId,
          assigned_to_user_id,
          workspace_id: opportunity.workspace_id,
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
      assigneeId = assignee.id;
    }

    // Return with full details
    const { data: fullAssignee } = await (supabase
      .from('opportunity_assignees_with_details' as any)
      .select('*')
      .eq('id', assigneeId)
      .single() as any);

    return NextResponse.json(
      {
        message: 'User assigned to opportunity successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/opportunities/[id]/assignees/[assigneeId]
 * Unassign a user from an opportunity
 */
const unassignOpportunityFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: opportunityId, assigneeId } = params || {};

    if (!opportunityId || !assigneeId) {
      return NextResponse.json(
        { message: 'Opportunity ID and Assignee ID are required' },
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

    // Hard delete the assignment row to avoid UNIQUE constraint conflicts
    const adminClient = getSupabaseServerAdminClient();

    const { error: deleteError } = await (adminClient
      .from('opportunity_assignees' as any)
      .delete()
      .eq('id', assigneeId)
      .eq('opportunity_id', opportunityId) as any);

    if (deleteError) {
      console.error('Unassign user error:', deleteError);
      throw deleteError;
    }

    return successDataResponse('User unassigned from opportunity successfully');
  },
);

export {
  getOpportunityAssignees,
  assignOpportunityToUser,
  unassignOpportunityFromUser,
};
