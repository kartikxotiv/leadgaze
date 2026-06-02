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

  const [{ data: workspace }, rbac] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', workspaceId)
      .single(),
    getRbacSnapshot({
      accountId: user.id,
      organizationId: workspaceId,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
      workspace,
      rbac,
    },
  });
}
