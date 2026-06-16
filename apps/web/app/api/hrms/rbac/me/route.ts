import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { getRbacSnapshot } from '~/lib/server/rbac';

export async function GET() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await getCurrentUserOrganizationId(user.id);

  if (!workspaceId) {
    return NextResponse.json(
      { message: 'Workspace not found for user' },
      { status: 404 },
    );
  }

  const snapshot = await getRbacSnapshot({
    accountId: user.id,
    organizationId: workspaceId,
  });

  return NextResponse.json({
    success: true,
    data: {
      organizationId: workspaceId,
      workspaceId,
      employeeId: snapshot.employeeId,
      roleKeys: snapshot.roleKeys,
      allowedModules: snapshot.allowedModules,
      permissions: snapshot.permissions,
    },
  });
}
