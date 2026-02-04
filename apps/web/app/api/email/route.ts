import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
        return NextResponse.json(
            { error: 'Workspace ID is required' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
