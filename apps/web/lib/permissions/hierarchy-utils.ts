import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@kit/supabase/database';

export type HierarchyFilter =
  | { type: 'all' }
  | { type: 'restricted'; userIds: string[] };

type HierarchyVisibilityOptions = {
  requireSharedTeam?: boolean;
};

export async function getHierarchyVisibleUserIds(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string,
  options: HierarchyVisibilityOptions = {},
): Promise<HierarchyFilter> {
  const { requireSharedTeam = true } = options;
  const resolveEffectiveLevel = (hierarchyLevel: number | null | undefined) => {
    return hierarchyLevel ?? 0;
  };

  const { data: members, error: memberError } = await supabase
    .from('workspace_members')
    .select(
      `
      role_id,
      product_key,
      role:workspace_roles!workspace_members_role_id_fkey(
        id,
        role_key,
        hierarchy_level
      )
    `,
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (memberError || !members || members.length === 0) {
    console.error('Failed to get user role:', memberError);
    return { type: 'restricted', userIds: [userId] };
  }

  const member = members.find((m: any) => m.product_key === 'sales')
    || members.find((m: any) => m.product_key === null)
    || members[0];

  const roleData = Array.isArray(member.role) ? member.role[0] : member.role;
  const userLevel = resolveEffectiveLevel(roleData?.hierarchy_level);

  // Admins get full visibility
  if (roleData?.role_key === 'admin' || userLevel >= 100) {
    console.log(`[HIERARCHY] User ${userId} is admin, granting 'all' access.`);
    return { type: 'all' };
  }

  // 2. Load roles in workspace and find subordinate roles
  const { data: workspaceRoles, error: rolesError } = await supabase
    .from('workspace_roles')
    .select(
      `
      id,
      hierarchy_level
    `,
    )
    .eq('workspace_id', workspaceId);

  if (rolesError) {
    console.error('Failed to fetch subordinate roles:', rolesError);
    return { type: 'restricted', userIds: [userId] };
  }

  const subordinateRoleIds =
    workspaceRoles
      ?.filter((role) => {
        const roleLevel = resolveEffectiveLevel(role.hierarchy_level);
        return roleLevel < userLevel;
      })
      .map((role) => role.id) || [];

  if (subordinateRoleIds.length === 0) {
    // No subordinates (e.g., SDR), can only see own data
    return { type: 'restricted', userIds: [userId] };
  }

  // 3. Fetch all subordinate users in the entire workspace
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

  const subordinateUserIds = new Set(
    subordinateMembers?.map((m) => m.user_id) || [],
  );

  if (!requireSharedTeam) {
    const visibleUserIds = new Set<string>();
    visibleUserIds.add(userId);
    subordinateUserIds.forEach((id) => visibleUserIds.add(id));

    const visibleArray = Array.from(visibleUserIds);
    console.log(
      `[HIERARCHY] User ${userId} can see lower hierarchy users across workspace:`,
      visibleArray,
    );

    return { type: 'restricted', userIds: visibleArray };
  }

  // 4. Find teams where user is a member
  const { data: userTeams, error: userTeamsError } = await supabase
    .from('workspace_team_members')
    .select('team_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (userTeamsError) {
    console.error('Failed to get user teams:', userTeamsError);
    return { type: 'restricted', userIds: [userId] };
  }

  const managedTeamIds = userTeams?.map((t) => t.team_id) || [];

  if (managedTeamIds.length === 0) {
    // User is not a member of any team. Can only see own data.
    return { type: 'restricted', userIds: [userId] };
  }

  // 5. Fetch all users in the managed teams
  const { data: teamMembers, error: teamMembersError } = await supabase
    .from('workspace_team_members')
    .select('user_id')
    .in('team_id', managedTeamIds);

  if (teamMembersError) {
    console.error('Failed to get team members:', teamMembersError);
    return { type: 'restricted', userIds: [userId] };
  }

  const teamMemberUserIds = new Set(teamMembers?.map((m) => m.user_id) || []);

  // 6. Intersect: visible users must be in managed team AND be subordinates
  const visibleUserIds = new Set<string>();
  visibleUserIds.add(userId); // always see own data

  teamMemberUserIds.forEach((id) => {
    if (subordinateUserIds.has(id)) {
      visibleUserIds.add(id);
    }
  });

  const visibleArray = Array.from(visibleUserIds);
  console.log(
    `[HIERARCHY] User ${userId} is manager of teams [${managedTeamIds.join(',')}]. Visible subordinate users:`,
    visibleArray,
  );

  return { type: 'restricted', userIds: visibleArray };
}
