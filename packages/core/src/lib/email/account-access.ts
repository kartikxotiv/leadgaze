export type EmailAccountAccessScope = 'private' | 'workspace';

export interface WorkspaceMemberContext {
  userId: string;
  isAdmin: boolean;
}

export async function getWorkspaceMemberContext(
  supabase: any,
  workspaceId: string,
): Promise<WorkspaceMemberContext | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select(
      `
        user_id,
        product_key,
        role:workspace_roles!workspace_members_role_id_fkey(role_key, hierarchy_level)
      `,
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (membershipError || !memberships || memberships.length === 0) {
    return null;
  }

  const isAdmin = memberships.some((m: any) => {
    const role = Array.isArray(m.role) ? m.role[0] : m.role;
    return role?.role_key === 'admin' || (role?.hierarchy_level ?? 0) >= 100;
  });

  return {
    userId: user.id,
    isAdmin,
  };
}

export async function listWorkspaceEmailAccounts(
  supabase: any,
  workspaceId: string,
) {
  const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);

  if (!memberContext) {
    return [];
  }

  const { data: accounts, error } = await (supabase as any)
    .schema('core')
    .from('email_accounts')
    .select(
      'id,email,created_at,from_name,is_active,provider,workspace_id,owner_user_id,access_scope,is_sync_enabled,inbound_enabled,outbound_enabled,settings',
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const ownerIds = Array.from(
    new Set(
      (accounts ?? [])
        .map((account: any) => account.owner_user_id)
        .filter(Boolean),
    ),
  );

  let ownerMap = new Map<
    string,
    { id: string; name: string | null; email: string | null }
  >();

  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await supabase
      .from('accounts')
      .select('id,name,email')
      .in('id', ownerIds);

    if (ownersError) throw ownersError;

    ownerMap = new Map((owners ?? []).map((owner: any) => [owner.id, owner]));
  }

  const { data: grants } = await (supabase as any)
    .schema('core')
    .from('email_account_access_grants')
    .select('email_account_id,can_send,can_sync')
    .eq('workspace_id', workspaceId)
    .eq('grantee_user_id', memberContext.userId);

  const grantedSendAccountIds = new Set(
    (
      (grants as Array<{
        email_account_id: number;
        can_send: boolean;
      }> | null) ?? []
    )
      .filter((grant) => grant.can_send)
      .map((grant) => grant.email_account_id),
  );

  return (accounts ?? [])
    .filter((account: any) => !account.settings?.deleted_at)
    .map((account: any) => {
      const isOwner = account.owner_user_id === memberContext.userId;
      const canSend =
        memberContext.isAdmin ||
        isOwner ||
        account.access_scope === 'workspace' ||
        grantedSendAccountIds.has(account.id);

      return {
        ...account,
        owner: account.owner_user_id
          ? (ownerMap.get(account.owner_user_id) ?? null)
          : null,
        is_owner: isOwner,
        can_manage: memberContext.isAdmin || isOwner,
        can_change_access: memberContext.isAdmin,
        can_send: canSend,
        can_view_inbox: canSend && account.inbound_enabled !== false,
      };
    });
}

export async function getAccessibleInboxEmails(
  supabase: any,
  workspaceId: string,
) {
  const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);

  return accounts
    .filter((account: any) => account.can_view_inbox)
    .map((account: any) => account.email.toLowerCase());
}

export async function getAccessibleInboxAccounts(
  supabase: any,
  workspaceId: string,
) {
  const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);

  return accounts
    .filter((account: any) => account.can_view_inbox)
    .map((account: any) => ({
      id: account.id,
      email: account.email.toLowerCase(),
    }));
}

export async function getSendableEmailAccountById(
  supabase: any,
  workspaceId: string,
  emailAccountId?: number,
) {
  const accountSummaries = await listWorkspaceEmailAccounts(
    supabase,
    workspaceId,
  );
  const sendableAccounts = accountSummaries.filter(
    (account: any) =>
      account.can_send &&
      account.is_active !== false &&
      account.outbound_enabled !== false,
  );
  const targetAccountId = emailAccountId || sendableAccounts[0]?.id;

  if (!targetAccountId) {
    return null;
  }

  const allowedAccount = sendableAccounts.find(
    (account: any) => account.id === targetAccountId,
  );

  if (!allowedAccount) {
    return null;
  }

  const { data: fullAccount, error } = await (supabase as any)
    .schema('core')
    .from('email_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', targetAccountId)
    .single();

  if (error) throw error;

  return fullAccount;
}
