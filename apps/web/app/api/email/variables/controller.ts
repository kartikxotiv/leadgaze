import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync, successDataResponse, successListDataResponse } from "~/utils/response-handler";

export const getWorkspaceVariables = catchAsync(async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: variables, error } = await supabase
        .from('workspace_email_variables')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('key', { ascending: true });

    if (error) {
        throw error;
    }

    return successListDataResponse(variables, { object: 'workspace_variable' });
});

export const saveWorkspaceVariable = catchAsync(async ({ request }) => {
    const payload: any = await request.json();
    const {
        id,
        workspace_id,
        key,
        value
    } = payload;

    if (!workspace_id || !key) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const upsertData: any = {
        workspace_id,
        key,
        value,
        updated_at: new Date().toISOString()
    };

    if (id) {
        upsertData.id = id;
    }

    const { data: variable, error } = await supabase
        .from('workspace_email_variables')
        .upsert(upsertData)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return successDataResponse(variable);
});

export const deleteWorkspaceVariable = catchAsync(async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
        .from('workspace_email_variables')
        .delete()
        .eq('id', parseInt(id));

    if (error) {
        throw error;
    }

    return successDataResponse('Workspace variable deleted successfully');
});
