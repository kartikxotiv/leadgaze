import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type ContactAssignee = Database['public']['Tables']['contact_assignees']['Row'];

/**
 * GET /api/contacts/[id]/assignees
 * Get all assignees for a contact
 */
const getContactAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const contactId = params?.id;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await (supabase
      .from('contact_assignees_with_details' as any)
      .select('*')
      .eq('contact_id', contactId)
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
 * POST /api/contacts/[id]/assignees
 * Assign a user to a contact
 */
const assignContactToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const contactId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 },
      );
    }

    if (!assigned_to_user_id) {
      return NextResponse.json(
        { message: 'assigned_to_user_id is required' },
        { status: 400 },
      );
    }

    // Get the contact to verify it exists and get workspace_id
    const { data: contact, error: contactError } = await supabase
      .from('crm_contacts')
      .select('id, workspace_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await (supabase
      .from('contact_assignees' as any)
      .select('id')
      .eq('contact_id', contactId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .single() as any);

    if (existingAssignment) {
      return NextResponse.json(
        { message: 'User is already assigned to this contact' },
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
      .from('contact_assignees' as any)
      .insert({
        contact_id: contactId,
        assigned_to_user_id,
        workspace_id: contact.workspace_id,
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
      .from('contact_assignees_with_details' as any)
      .select('*')
      .eq('id', assignee.id)
      .single() as any);

    return NextResponse.json(
      {
        message: 'User assigned to contact successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/contacts/[id]/assignees/[assigneeId]
 * Unassign a user from a contact
 */
const unassignContactFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: contactId, assigneeId } = params || {};

    if (!contactId || !assigneeId) {
      return NextResponse.json(
        { message: 'Contact ID and Assignee ID are required' },
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
      .from('contact_assignees' as any)
      .update({
        assignment_status: 'inactive',
        unassigned_at: new Date().toISOString(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assigneeId)
      .eq('contact_id', contactId) as any);

    if (updateError) {
      console.error('Unassign user error:', updateError);
      throw updateError;
    }

    return successDataResponse('User unassigned from contact successfully');
  },
);

export { getContactAssignees, assignContactToUser, unassignContactFromUser };
