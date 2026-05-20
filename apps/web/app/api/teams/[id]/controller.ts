import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

const updateTeam = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id } = params || {};
    
    if (!id) {
      return NextResponse.json({ message: 'Team ID is required' }, { status: 400 });
    }

    const { name, description } = await request.json();

    const { data: updatedTeam, error } = await supabase
      .from('workspace_teams')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update team error:', error);
      throw error;
    }

    return successDataResponse({
      data: updatedTeam,
      message: 'Team updated successfully',
    });
  },
);

const deleteTeam = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    const { id } = params || {};

    if (!id) {
      return NextResponse.json({ message: 'Team ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('workspace_teams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete team error:', error);
      throw error;
    }

    return successDataResponse({
      message: 'Team deleted successfully',
    });
  },
);

export { updateTeam, deleteTeam };
