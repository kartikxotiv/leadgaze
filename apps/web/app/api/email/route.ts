import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  getWorkspaceMemberContext,
  listWorkspaceEmailAccounts,
} from '~/lib/email/email-account-access';

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

    const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);
    if (!memberContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);

    return NextResponse.json(accounts);
}

export async function PATCH(request: NextRequest) {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { id, workspace_id, is_active, access_scope } = body;

    if (!id || !workspace_id) {
        return NextResponse.json(
            { error: 'ID and Workspace ID are required' },
            { status: 400 }
        );
    }

    const memberContext = await getWorkspaceMemberContext(supabase, workspace_id);
    if (!memberContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: existingAccount, error: existingAccountError } = await (supabase
        .from('email_accounts') as any)
        .select('id,workspace_id,owner_user_id')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

    if (existingAccountError || !existingAccount) {
        return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    const isOwner = existingAccount.owner_user_id === memberContext.userId;
    if (!memberContext.isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (typeof access_scope !== 'undefined' && !memberContext.isAdmin) {
        return NextResponse.json(
            { error: 'Only admins can change account access' },
            { status: 403 }
        );
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') {
        updatePayload.is_active = is_active;
    }
    if (access_scope) {
        updatePayload.access_scope = access_scope;
    }

    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('email_accounts')
        .update(updatePayload as any)
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

    const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);
    if (!memberContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: existingAccount, error: existingAccountError } = await (supabase
        .from('email_accounts') as any)
        .select('id, owner_user_id')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();

    if (existingAccountError || !existingAccount) {
        return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    const isOwner = existingAccount.owner_user_id === memberContext.userId;
    if (!memberContext.isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
