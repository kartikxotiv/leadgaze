export type EmailAccountAccessScope = 'private' | 'workspace';

export interface WorkspaceEmailAccount {
  id: number;
  workspace_id: string;
  email: string;
  from_name: string | null;
  provider: 'google' | 'outlook' | 'smtp';
  is_active: boolean | null;
  created_at: string | null;
  owner_user_id: string;
  access_scope: EmailAccountAccessScope;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  is_owner: boolean;
  can_manage: boolean;
  can_change_access: boolean;
  can_send: boolean;
  can_view_inbox: boolean;
}

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

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select(
      `
        user_id,
        role:workspace_roles!workspace_members_role_id_fkey(
          role_key
        )
      `,
    )
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (membershipError || !membership) {
    return null;
  }

  const role = Array.isArray((membership as any).role)
    ? (membership as any).role[0]
    : (membership as any).role;

  return {
    userId: user.id,
    isAdmin: role?.role_key === 'admin',
  };
}

export async function listWorkspaceEmailAccounts(
  supabase: any,
  workspaceId: string,
): Promise<WorkspaceEmailAccount[]> {
  const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);

  if (!memberContext) {
    return [];
  }

  const { data: accounts, error } = await (supabase
    .from('email_accounts') as any)
    .select(
      'id,email,created_at,from_name,is_active,provider,workspace_id,owner_user_id,access_scope',
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const ownerIds = Array.from(
    new Set(
      (accounts || [])
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

    if (ownersError) {
      throw ownersError;
    }

    ownerMap = new Map((owners || []).map((owner: any) => [owner.id, owner]));
  }

  const { data: grants } = await (supabase as any)
    .from('email_account_access_grants')
    .select('email_account_id')
    .eq('workspace_id', workspaceId)
    .eq('grantee_user_id', memberContext.userId)
    .eq('can_send', true);

  const grantedAccountIds = new Set(
    ((grants as Array<{ email_account_id: number }> | null) || []).map(
      (grant) => grant.email_account_id,
    ),
  );

  return (accounts || []).map((account: any) => {
    const isOwner = account.owner_user_id === memberContext.userId;
    const canSend =
      memberContext.isAdmin ||
      isOwner ||
      account.access_scope === 'workspace' ||
      grantedAccountIds.has(account.id);
    const canViewInbox = canSend;

    return {
      ...account,
      owner: ownerMap.get(account.owner_user_id) || null,
      is_owner: isOwner,
      can_manage: memberContext.isAdmin || isOwner,
      can_change_access: memberContext.isAdmin,
      can_send: canSend,
      can_view_inbox: canViewInbox,
    };
  });
}

export async function getAccessibleInboxEmails(
  supabase: any,
  workspaceId: string,
) {
  const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);

  return accounts
    .filter((account) => account.can_view_inbox && account.is_active !== false)
    .map((account) => account.email.toLowerCase());
}

export async function hasWorkspaceEmailFeatureAccess(
  supabase: any,
  workspaceId: string,
  featureKey: 'view_inbox' | 'send_emails',
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .eq('status', 'accepted')
    .single();

  if (!member?.role_id) {
    return false;
  }

  const { data: permission } = await supabase
    .from('role_permissions')
    .select(
      `
        can_access,
        crm_module_features!inner (
          feature_key,
          crm_modules!inner (
            module_key
          )
        )
      `,
    )
    .eq('role_id', member.role_id)
    .eq('crm_module_features.feature_key', featureKey)
    .eq('crm_module_features.crm_modules.module_key', 'emails')
    .single();

  return !!permission?.can_access;
}

export async function getSendableEmailAccountById(
  supabase: any,
  workspaceId: string,
  emailAccountId?: number,
) {
  const accountSummaries = await listWorkspaceEmailAccounts(supabase, workspaceId);
  const sendableAccounts = accountSummaries.filter(
    (account) => account.can_send && account.is_active !== false,
  );

  const targetAccountId = emailAccountId || sendableAccounts[0]?.id;

  if (!targetAccountId) {
    return null;
  }

  const allowedAccount = sendableAccounts.find(
    (account) => account.id === targetAccountId,
  );

  if (!allowedAccount) {
    return null;
  }

  const { data: fullAccount, error } = await (supabase
    .from('email_accounts') as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', targetAccountId)
    .single();

  if (error) {
    throw error;
  }

  return fullAccount;
}

export async function getFirstSendableEmailAccount(
  supabase: any,
  workspaceId: string,
) {
  const sendableAccount = await getSendableEmailAccountById(
    supabase,
    workspaceId,
  );

  if (!sendableAccount) {
    return null;
  }

  return sendableAccount;
}
