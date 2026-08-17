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

    const { data: roles } = await supabase
      .from('workspace_roles')
      .select('id, role_key')
      .eq('workspace_id', workspaceId)
      .in('id', orderedRoleIds);

    const adminRoleIdSet = new Set(
      (roles || [])
        .filter((r: any) => r.role_key === 'admin')
        .map((r: any) => r.id),
    );

    let customRoleCounter = 1;
    const updatePromises = orderedRoleIds.map((roleId: string) => {
      if (adminRoleIdSet.has(roleId)) {
        return Promise.resolve({ error: null });
      }

      const hierarchy_level = customRoleCounter++;
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
