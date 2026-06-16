import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(getSupabaseServerClient());
  const supabase = getSupabaseServerClient();

  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (tokenHash && type) {
    const nextPath = await service.verifyTokenHash(request, {
      redirectPath: pathsConfig.app.home,
    });

    // Check for pending workspace invitations after token hash verification
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
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
          return redirect(`/invite?token=${invitation.token}`);
        }
      }
    } catch (error) {
      console.error('Error checking invitations in callback verifyTokenHash:', error);
    }

    return redirect(nextPath.toString());
  }

  const { nextPath } = await service.exchangeCodeForSession(request, {
    redirectPath: pathsConfig.app.home,
  });

  // Check for pending workspace invitations after authentication
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      // Check for pending invitations
      const { data: invitation } = await supabase
        .from('workspace_invitations')
        .select('id, token, email, status, token_expires_at')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if invitation is valid (not expired)
      if (
        invitation &&
        (!invitation.token_expires_at ||
          new Date(invitation.token_expires_at) >= new Date())
      ) {
        // Redirect to invite acceptance page
        return redirect(`/invite?token=${invitation.token}`);
      }
    }
  } catch (error) {
    // If check fails, proceed with normal redirect
    console.error('Error checking invitations in callback:', error);
  }

  return redirect(nextPath);
}
