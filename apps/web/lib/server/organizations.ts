import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
};

export const getUserOrganizations = cache(async (userId?: string) => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = userId
    ? { data: { user: { id: userId } } }
    : await supabase.auth.getUser();

  if (!user?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(id, name, slug, owner_id)')
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (error) {
    throw error;
  }

  const workspaces = (data ?? [])
    .map((member) => member.workspace as unknown as WorkspaceRow | null)
    .filter((workspace): workspace is WorkspaceRow => Boolean(workspace));

  // Deduplicate by workspace ID
  return Array.from(new Map(workspaces.map((w) => [w.id, w])).values());
});

export async function getCurrentUserOrganizationId(userId?: string) {
  const workspaces = await getUserOrganizations(userId);

  return workspaces[0]?.id ?? null;
}

export const getCurrentUserWorkspaceId = getCurrentUserOrganizationId;
