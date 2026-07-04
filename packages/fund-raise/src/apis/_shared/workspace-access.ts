'use server';

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function assertWorkspaceAccess(workspaceId: string) {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 },
      ),
    };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if (workspaceError || !workspace) {
    return {
      supabase,
      user,
      error: NextResponse.json(
        { success: false, message: 'Workspace not found' },
        { status: 404 },
      ),
    };
  }

  const isOwner = workspace.owner_id === user.id;

  if (!isOwner) {
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const membership = memberships && memberships.length > 0 ? memberships[0] : null;

    if (!membership) {
      return {
        supabase,
        user,
        error: NextResponse.json(
          { success: false, message: 'Forbidden: You are not a member of this workspace' },
          { status: 403 },
        ),
      };
    }
  }

  return { supabase, user, error: null };
}
