import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

export const reorderRoles = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const { workspaceId, orderedRoleIds } = await request.json();

    if (!workspaceId || !Array.isArray(orderedRoleIds)) {
      return NextResponse.json(
        { message: 'workspaceId and orderedRoleIds array are required' },
        { status: 400 },
      );
    }

    // Role ordered starting with top of the list representing highest hierarchy
    // The top role gets level = orderedRoleIds.length - 1
    // The bottom role gets level = 0
    const totalRoles = orderedRoleIds.length;
    
    const updatePromises = orderedRoleIds.map((roleId: string, index: number) => {
      const hierarchy_level = totalRoles - 1 - index;
      return supabase
        .from('workspace_roles')
        .update({ hierarchy_level })
        .eq('id', roleId)
        .eq('workspace_id', workspaceId);
    });

    const results = await Promise.all(updatePromises);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Errors updating role orders:', errors.map(e => e.error));
      throw new Error('Failed to update all role orderings');
    }

    return successDataResponse('Roles reordered successfully', null);
  }
);
