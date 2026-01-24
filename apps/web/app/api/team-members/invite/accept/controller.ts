import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const acceptInvite = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { message: 'token and userId are required' },
        { status: 400 },
      );
    }

    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation token' },
        { status: 404 },
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: `Invitation has already been ${invitation.status}` },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (
      invitation.token_expires_at &&
      new Date(invitation.token_expires_at!) < new Date()
    ) {
      return NextResponse.json(
        { message: 'Invitation token has expired' },
        { status: 400 },
      );
    }

    // Update invitation status to accepted and link user
    const { error: updateInviteError } = await supabase
      .from('workspace_invitations')
      .update({
        status: 'accepted',
        user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Update invitation error:', updateInviteError);
      throw updateInviteError;
    }

    // Create workspace member record
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role_id: invitation.role_id,
        status: 'accepted',
        invited_by: invitation.invited_by,
        invited_at: invitation.invited_at,
        accepted_at: new Date().toISOString(),
        is_primary_contact: invitation.is_primary_contact,
        personal_settings: invitation.personal_settings,
      })
      .select()
      .single();

    if (memberError) {
      // If member already exists, that's okay - just return success
      if (memberError.code === '23505') {
        // Unique constraint violation
        return successDataResponse(
          'Invitation accepted and workspace member access granted',
          { workspace_id: invitation.workspace_id, user_id: userId },
        );
      }
      console.error('Create member error:', memberError);
      throw memberError;
    }

    // Get workspace details to return
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', invitation.workspace_id)
      .single();

    return successDataResponse('Invitation accepted successfully', {
      workspace,
      member,
      message: 'You now have access to the workspace',
    });
  },
);

export { acceptInvite };
