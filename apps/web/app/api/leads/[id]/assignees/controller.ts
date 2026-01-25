import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type LeadAssignee = Database['public']['Tables']['lead_assignees']['Row'];

/**
 * GET /api/leads/[id]/assignees
 * Get all assignees for a lead
 */
const getLeadAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'Lead ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await supabase
      .from('lead_assignees_with_details')
      .select('*')
      .eq('lead_id', leadId)
      .eq('assignment_status', 'active')
      .order('assigned_at', { ascending: true });

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
 * POST /api/leads/[id]/assignees
 * Assign a user to a lead
 */
const assignLeadToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!leadId) {
      return NextResponse.json(
        { message: 'Lead ID is required' },
        { status: 400 },
      );
    }

    if (!assigned_to_user_id) {
      return NextResponse.json(
        { message: 'assigned_to_user_id is required' },
        { status: 400 },
      );
    }

    // Get the lead to verify it exists and get workspace_id
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('id, workspace_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('lead_assignees')
      .select('id')
      .eq('lead_id', leadId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .single();

    if (existingAssignment) {
      return NextResponse.json(
        { message: 'User is already assigned to this lead' },
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
    const { data: assignee, error: insertError } = await supabase
      .from('lead_assignees')
      .insert({
        lead_id: leadId,
        assigned_to_user_id,
        workspace_id: lead.workspace_id,
        assigned_by: user.id,
        created_by: user.id,
        assignment_status: 'active',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Assign user error:', insertError);
      throw insertError;
    }

    // Return with full details
    const { data: fullAssignee } = await supabase
      .from('lead_assignees_with_details')
      .select('*')
      .eq('id', assignee.id)
      .single();

    return NextResponse.json(
      {
        message: 'User assigned to lead successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/leads/[id]/assignees/[assigneeId]
 * Unassign a user from a lead
 */
const unassignLeadFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: leadId, assigneeId } = params || {};

    if (!leadId || !assigneeId) {
      return NextResponse.json(
        { message: 'Lead ID and Assignee ID are required' },
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
    const { error: updateError } = await supabase
      .from('lead_assignees')
      .update({
        assignment_status: 'inactive',
        unassigned_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assigneeId)
      .eq('lead_id', leadId);

    if (updateError) {
      console.error('Unassign user error:', updateError);
      throw updateError;
    }

    return successDataResponse('User unassigned from lead successfully');
  },
);

export { getLeadAssignees, assignLeadToUser, unassignLeadFromUser };
