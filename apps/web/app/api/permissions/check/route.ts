/**
 * API Route: Check Permission
 * Quick endpoint to check if user has access to a specific feature
 */
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { checkUserPermission } from '~/lib/permissions/permission.api';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { canAccess: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const moduleKey = searchParams.get('moduleKey');
    const featureKey = searchParams.get('featureKey');

    if (!workspaceId || !moduleKey || !featureKey) {
      return NextResponse.json(
        { canAccess: false, error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Check permission
    const canAccess = await checkUserPermission(
      user.id,
      workspaceId,
      moduleKey,
      featureKey,
    );

    return NextResponse.json({ canAccess });
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json(
      { canAccess: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
