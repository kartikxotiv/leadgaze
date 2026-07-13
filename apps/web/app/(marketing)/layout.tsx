import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export default async function MarketingLayout({
  children: _children,
}: React.PropsWithChildren) {
  const supabase = getSupabaseServerClient();

  // Check if the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Authenticated user — resolve the correct destination server-side
    // so they skip the /org/home flash entirely.
    try {
      const { count, error } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (!error && (count ?? 0) > 0) {
        redirect(pathsConfig.app.home);
      }

      // Check for pending invitations
      if (user.email) {
        const { data: invitation } = await supabase
          .from('workspace_invitations')
          .select('id, token, email, status, token_expires_at')
          .eq('email', user.email.toLowerCase())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (
          invitation &&
          (!invitation.token_expires_at ||
            new Date(invitation.token_expires_at) >= new Date())
        ) {
          redirect(`/invite?token=${invitation.token}`);
        }
      }

      redirect(pathsConfig.app.workspaceSetup);
    } catch {
      // If any check fails, fall through to sign-in
      redirect(pathsConfig.auth.signIn);
    }
  }

  // Unauthenticated user — redirect to sign-in
  redirect(pathsConfig.auth.signIn);
}
