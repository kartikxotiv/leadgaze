import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '../database.types';

export type HierarchyFilter = 
  | { type: 'all' }
  | { type: 'restricted'; userIds: string[] };

export async function getHierarchyVisibleUserIds(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string,
): Promise<HierarchyFilter> {
  const resolveEffectiveLevel = (
    hierarchyLevel: number | null | undefined,
    hierarchyRelation: { level?: number | null } | { level?: number | null }[] | null | undefined,
  ) => {
    const hierarchy = Array.isArray(hierarchyRelation)
      ? hierarchyRelation[0]
      : hierarchyRelation;

    // Prefer level from workspace_hierarchies when present; fallback to legacy hierarchy_level.
    if (typeof hierarchy?.level === 'number') {
      return hierarchy.level;
    }

    return hierarchyLevel ?? 0;
  };

  // 1. Get the current user's role and hierarchy level in this workspace
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select(`
      role_id,
      role:workspace_roles!workspace_members_role_id_fkey(
        id,
        role_key,
        role_name,
        hierarchy_level,
        hierarchy:workspace_hierarchies!workspace_roles_hierarchy_id_fkey(
          level
        )
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .single();

  if (memberError || !member || !member.role) {
    console.error('Failed to get user hierarchy level:', memberError);
    // Fallback: only show own data if we can't determine hierarchy
    return { type: 'restricted', userIds: [userId] };
  }

  // Handle potential array or single object from role join
  const roleData = Array.isArray(member.role) ? member.role[0] : member.role;
  const userLevel = resolveEffectiveLevel(
    roleData?.hierarchy_level,
    roleData?.hierarchy,
  );

  // Only top hierarchy level (100+) gets full visibility.
  // Sub-levels like "junior admin" remain restricted by numeric level.
  if (userLevel >= 100) {
    console.log(`[HIERARCHY] User ${userId} has high level ${userLevel}, granting 'all' access.`);
    return { type: 'all' };
  }

  // 2. Load roles in workspace and resolve level from hierarchy_level or hierarchy.level
  const { data: workspaceRoles, error: rolesError } = await supabase
    .from('workspace_roles')
    .select(`
      id,
      hierarchy_level,
      hierarchy:workspace_hierarchies!workspace_roles_hierarchy_id_fkey(
        level
      )
    `)
    .eq('workspace_id', workspaceId);

  if (rolesError) {
    console.error('Failed to fetch subordinate roles:', rolesError);
    return { type: 'restricted', userIds: [userId] };
  }

  const subordinateRoleIds =
    workspaceRoles
      ?.filter((role) => {
        const roleLevel = resolveEffectiveLevel(
          role.hierarchy_level,
          role.hierarchy,
        );
        return roleLevel < userLevel;
      })
      .map((role) => role.id) || [];

  if (subordinateRoleIds.length === 0) {
    // No subordinates (e.g., SDR), can only see own data
    return { type: 'restricted', userIds: [userId] };
  }

  // Fetch users with those subordinate roles
  const { data: subordinateMembers, error: membersError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'accepted')
    .in('role_id', subordinateRoleIds);

  if (membersError) {
    console.error('Failed to fetch subordinate members:', membersError);
    return { type: 'restricted', userIds: [userId] };
  }

  const visibleUserIds = (subordinateMembers?.map(m => m.user_id) || []).concat([userId]);

  console.log(`[HIERARCHY] User ${userId} (level ${userLevel}) can see leads of:`, visibleUserIds);

  // 3. Return the restricted list of visible user IDs
  return { type: 'restricted', userIds: visibleUserIds };
}
