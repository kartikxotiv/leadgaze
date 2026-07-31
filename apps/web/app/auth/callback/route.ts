import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

/**
 * Determine the best redirect destination after authentication.
 * Priority: invitation > explicit `next` param > workspace check > home.
 */
async function resolvePostAuthRedirect(
  nextPathFromParams: string | null,
): Promise<string> {
  const supabase = getSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return nextPathFromParams ?? pathsConfig.app.home;
    }

    // 1. Check for pending workspace invitations
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
      return `/invite?token=${invitation.token}`;
    }

    // 2. If an explicit `next` path was provided (e.g. from OAuth redirect),
    //    honour it — but only if the user actually has a workspace.
    // 3. Check workspace membership
    const { count, error } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) {
      console.error('Workspace membership check error:', error);
      return nextPathFromParams ?? pathsConfig.app.home;
    }

    const hasWorkspace = (count ?? 0) > 0;

    if (!hasWorkspace) {
      return pathsConfig.app.workspaceSetup;
    }

    if (count !== null && count > 1) {
      return '/workspace-select';
    }

    return nextPathFromParams ?? pathsConfig.app.home;
  } catch (error) {
    console.error('Error resolving post-auth redirect:', error);
    return nextPathFromParams ?? pathsConfig.app.home;
  }
}

export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(getSupabaseServerClient());
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (tokenHash && type) {
    await service.verifyTokenHash(request, {
      redirectPath: pathsConfig.app.home,
    });

    const nextFromParams = searchParams.get('next');
    const destination = await resolvePostAuthRedirect(nextFromParams);
    return redirect(destination);
  }

  const { nextPath } = await service.exchangeCodeForSession(request, {
    redirectPath: pathsConfig.app.home,
  });

  const nextFromParams = searchParams.get('next');
  const destination = await resolvePostAuthRedirect(nextFromParams ?? nextPath);
  return redirect(destination);
}
