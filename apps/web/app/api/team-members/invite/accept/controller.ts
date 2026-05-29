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

    // Check if a member record already exists (e.g. previously removed user)
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    let member;

    if (existingMember) {
      // Re-activate the existing member record instead of inserting a duplicate
      const { data: updatedMember, error: updateMemberError } = await supabase
        .from('workspace_members')
        .update({
          role_id: invitation.role_id,
          status: 'accepted',
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          accepted_at: new Date().toISOString(),
          is_primary_contact: invitation.is_primary_contact,
          personal_settings: invitation.personal_settings,
        })
        .eq('id', existingMember.id)
        .select()
        .single();

      if (updateMemberError) {
        console.error('Re-activate member error:', updateMemberError);
        throw updateMemberError;
      }

      member = updatedMember;
    } else {
      // Create a new workspace member record
      const { data: newMember, error: memberError } = await supabase
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
        console.error('Create member error:', memberError);
        throw memberError;
      }

      member = newMember;
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
