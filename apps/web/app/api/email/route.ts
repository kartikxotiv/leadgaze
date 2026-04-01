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
        .select('id,email,created_at,from_name,is_active,provider,workspace_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { id, workspace_id, is_active } = body;

    if (!id || !workspace_id) {
        return NextResponse.json(
            { error: 'ID and Workspace ID are required' },
            { status: 400 }
        );
    }

    if (is_active) {
        // If setting to active, first deactivate all other accounts for this workspace
        const { error: deactivateError } = await supabase
            .from('email_accounts')
            .update({ is_active: false })
            .eq('workspace_id', workspace_id);

        if (deactivateError) {
            return NextResponse.json({ error: deactivateError.message }, { status: 500 });
        }
    }

    // Update the target account
    const { data, error } = await supabase
        .from('email_accounts')
        .update({ is_active })
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const id = Number(searchParams.get('id')); // ID is a number
    const workspaceId = searchParams.get('workspace_id');

    if (!id || !workspaceId) {
        return NextResponse.json(
            { error: 'ID and Workspace ID are required' },
            { status: 400 }
        );
    }

    const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
