/**
 * Debug Route: Check Permission Data
 * Returns raw permission data for debugging
 */
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({
        error: 'Missing workspaceId',
      });
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' });
    }

    // Get user's role in the workspace
    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('role_id, workspace_roles (*)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!memberData) {
      return NextResponse.json({
        error: 'User not member of workspace',
      });
    }

    const roleId = memberData.role_id;
    const role = memberData.workspace_roles;

    // Get all permissions for this role
    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId)
      .eq('workspace_id', workspaceId);

    // Get all modules
    const { data: modules } = await supabase
      .from('crm_modules')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Get all features
    const { data: features } = await supabase
      .from('crm_module_features')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      workspace_id: workspaceId,
      role: role,
      permissions_count: permissions?.length || 0,
      modules_count: modules?.length || 0,
      features_count: features?.length || 0,
      permissions: permissions || [],
      modules: modules || [],
      features: features || [],
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
