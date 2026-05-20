import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

const getAllTeams = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: teams, error } = await supabase
      .from('workspace_teams')
      .select('*, workspace_team_members(count)')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Get teams error:', error);
      throw error;
    }

    // Format the response to match the expected _count.members structure
    const formattedTeams = teams.map((team: any) => ({
      ...team,
      _count: {
        members: team.workspace_team_members?.[0]?.count || 0,
      },
    }));

    return successDataResponse('Teams retrieved successfully', formattedTeams);
  },
);

const createTeam = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { workspaceId, name, description } = await request.json();

    if (!workspaceId || !name) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check for duplicate name
    const { data: existingTeam, error: checkError } = await supabase
      .from('workspace_teams')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', name)
      .maybeSingle();

    if (checkError) {
      console.error('Check team error:', checkError);
      throw checkError;
    }

    if (existingTeam) {
      return NextResponse.json(
        { message: 'Team name already exists in this workspace' },
        { status: 409 },
      );
    }

    const { data: createdTeam, error: createTeamError } = await supabase
      .from('workspace_teams')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
      })
      .select()
      .single();

    if (createTeamError) {
      console.error('Create team error:', createTeamError);
      throw createTeamError;
    }

    return successDataResponse({
      data: createdTeam,
      message: 'Team created successfully',
      statusCode: 201,
    });
  },
);

export { getAllTeams, createTeam };
