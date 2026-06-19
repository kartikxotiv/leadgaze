import { NextRequest, NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const service = createAuthCallbackService(supabase);

  await service.verifyTokenHash(request, {
    redirectPath: pathsConfig.app.home,
  });

  // Determine the best redirect after email confirmation
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      const { count, error } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (!error && (count ?? 0) === 0) {
        return NextResponse.redirect(
          new URL(pathsConfig.app.workspaceSetup, request.url),
        );
      }
    }
  } catch (error) {
    console.error('Error checking workspace in confirm route:', error);
  }

  return NextResponse.redirect(new URL(pathsConfig.app.home, request.url));
}
