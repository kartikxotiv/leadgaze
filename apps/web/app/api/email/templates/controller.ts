import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync, successDataResponse, successListDataResponse } from "~/utils/response-handler";

export const getEmailTemplates = catchAsync(async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: templates, error } = await supabase
        .from('workspace_email_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return successListDataResponse(templates, { object: 'email_template' });
});

export const saveEmailTemplate = catchAsync(async ({ request }) => {
    const payload: any = await request.json();
    const {
        id,
        workspace_id,
        name,
        subject,
        html_body,
        variables
    } = payload;

    if (!workspace_id || !name || !subject || !html_body) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const upsertData: any = {
        workspace_id,
        name,
        slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        subject,
        html_body,
        variables: variables || [],
        updated_at: new Date().toISOString()
    };

    if (id) {
        upsertData.id = id;
    } else {
        upsertData.created_at = new Date().toISOString();
    }

    const { data: template, error } = await supabase
        .from('workspace_email_templates')
        .upsert(upsertData)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return successDataResponse(template);
});

export const deleteEmailTemplate = catchAsync(async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
        .from('workspace_email_templates')
        .delete()
        .eq('id', parseInt(id));

    if (error) {
        throw error;
    }

    return successDataResponse('Email template deleted successfully');
});
