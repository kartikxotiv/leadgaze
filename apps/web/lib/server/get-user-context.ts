import { cookies } from 'next/headers';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface UserContext {
  realUserId: string;
  effectiveUserId: string;
  workspaceId?: string;
  isImpersonating: boolean;
  impersonationSessionId?: string;
  targetUser?: {
    full_name: string;
    email: string;
  };
  reason?: string;
}

export async function getUserContext(): Promise<UserContext> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthenticated');
  }

  const cookieStore = await cookies();
  const impersonationSessionId = cookieStore.get('lg_impersonation')?.value;

  if (impersonationSessionId) {
    try {
      const adminClient = getSupabaseServerAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: session } = await (adminClient as any)
        .schema('admin')
        .from('impersonation_sessions')
        .select('id, admin_user_id, target_user_id, workspace_id, reason, expires_at, status')
        .eq('id', impersonationSessionId)
        // Check by target_user_id because the web portal is now authenticated
        // as the target user (the Supabase JWT is the target user's session).
        .eq('target_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (session && new Date(session.expires_at) > new Date()) {
        const { data: targetAccount } = await adminClient
          .from('accounts')
          .select('name, email')
          .eq('id', session.target_user_id)
          .maybeSingle();

        return {
          realUserId: session.admin_user_id,
          effectiveUserId: session.target_user_id,
          workspaceId: session.workspace_id,
          isImpersonating: true,
          impersonationSessionId: session.id,
          targetUser: {
            full_name: targetAccount?.name || 'Customer Account',
            email: targetAccount?.email || user.email || '',
          },
          reason: session.reason,
        };
      }
    } catch (err) {
      console.error('Error resolving impersonation context:', err);
    }
  }

  return {
    realUserId: user.id,
    effectiveUserId: user.id,
    isImpersonating: false,
  };
}
