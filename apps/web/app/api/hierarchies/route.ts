import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace ID is required' },
      { status: 400 },
    );
  }

  let { data: hierarchies, error } = await (supabase as any)
    .from('workspace_hierarchies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('level', { ascending: false });

  if (error) {
    console.error('Get hierarchies error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-seed if empty
  if (!hierarchies || hierarchies.length === 0) {
    const defaultTiers = [
      { workspace_id: workspaceId, name: 'Admin', level: 100, is_system: true },
      { workspace_id: workspaceId, name: 'Manager', level: 50, is_system: true },
      { workspace_id: workspaceId, name: 'SDR', level: 10, is_system: true },
    ];

    const adminClient = getSupabaseServerAdminClient();
    const { data: seeded, error: seedError } = await (adminClient as any)
      .from('workspace_hierarchies')
      .insert(defaultTiers)
      .select();

    if (seedError) {
      console.error('Auto-seed hierarchies error:', seedError);
      // Don't fail the whole request if seeding fails, just return empty
    } else {
      hierarchies = seeded;
    }
  }

  return NextResponse.json({ data: hierarchies || [] });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const body = await req.json();
  const { workspace_id, name, level } = body;

  if (!workspace_id || !name || level === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, name, level' },
      { status: 400 },
    );
  }

  // Verify the authenticated user belongs to this workspace
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (memberError) {
    console.error('Membership check error:', memberError);
    return NextResponse.json(
      { error: 'Error verifying workspace access' },
      { status: 500 },
    );
  }

  if (!membership) {
    return NextResponse.json(
      { error: 'Workspace not found or access denied' },
      { status: 403 },
    );
  }

  const adminClient = getSupabaseServerAdminClient();
  const { data: hierarchy, error } = await (adminClient as any)
    .from('workspace_hierarchies')
    .insert({ workspace_id, name, level })
    .select()
    .single();

  if (error) {
    console.error('Create hierarchy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: hierarchy });
}
