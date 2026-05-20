import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../../utils/response-handler';

const getTeamMembers = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: teamId } = params || {};

    if (!teamId) {
      return NextResponse.json({ message: 'Team ID is required' }, { status: 400 });
    }

    const { data: members, error } = await supabase
      .from('workspace_team_members')
      .select('*, accounts:accounts!workspace_team_members_user_id_fkey(name, email, picture_url)')
      .eq('team_id', teamId);

    if (error) {
      console.error('Get team members error:', error);
      throw error;
    }

    return successDataResponse('Team members retrieved successfully', members);
  },
);

const addTeamMember = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: teamId } = params || {};
    const { userId, isManager } = await request.json();

    if (!teamId || !userId) {
      return NextResponse.json(
        { message: 'Team ID and User ID are required' },
        { status: 400 },
      );
    }

    // Get workspace ID from team
    const { data: team, error: teamError } = await supabase
      .from('workspace_teams')
      .select('workspace_id')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Get team error:', teamError);
      throw teamError;
    }

    // Check if member already exists
    const { data: existingMember, error: checkError } = await supabase
      .from('workspace_team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingMember) {
      return NextResponse.json(
        { message: 'User is already a member of this team' },
        { status: 409 },
      );
    }

    const { data: addedMember, error: addError } = await supabase
      .from('workspace_team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        workspace_id: team.workspace_id,
        is_manager: isManager || false,
      })
      .select('*, accounts:accounts!workspace_team_members_user_id_fkey(name, email, picture_url)')
      .single();

    if (addError) {
      console.error('Add team member error:', addError);
      throw addError;
    }

    return successDataResponse({
      data: addedMember,
      message: 'Team member added successfully',
      statusCode: 201,
    });
  },
);

const updateTeamMemberRole = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: teamId } = params || {};
    const { userId, isManager } = await request.json();

    if (!teamId || !userId || isManager === undefined) {
      return NextResponse.json(
        { message: 'Team ID, User ID, and isManager are required' },
        { status: 400 },
      );
    }

    const { data: updatedMember, error } = await supabase
      .from('workspace_team_members')
      .update({ is_manager: isManager })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select('*, accounts:accounts!workspace_team_members_user_id_fkey(name, email, picture_url)')
      .single();

    if (error) {
      console.error('Update team member error:', error);
      throw error;
    }

    return successDataResponse({
      data: updatedMember,
      message: 'Team member role updated successfully',
    });
  },
);

const removeTeamMember = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: teamId } = params || {};
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!teamId || !userId) {
      return NextResponse.json(
        { message: 'Team ID and User ID are required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('workspace_team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      console.error('Remove team member error:', error);
      throw error;
    }

    return successDataResponse({
      message: 'Team member removed successfully',
    });
  },
);

export { getTeamMembers, addTeamMember, updateTeamMemberRole, removeTeamMember };
