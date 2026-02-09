import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from "~/utils/response-handler";
import { encrypt } from "~/utils/crypto";

export const submitSMTPDetails = catchAsync(
    async ({ request }: { request: NextRequest, params?: Record<string, string>; }) => {
        const body = await request.json();
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get('workspace_id');
        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
        }
        const supabase = getSupabaseServerClient();
        const {
            email,
            host,
            port,
            secure,
            username,
            password,
            from_name
        } = body;

        const { data, error } = await supabase.from("email_accounts").upsert({
            workspace_id: workspaceId,
            email,
            host,
            port,
            secure,
            username,
            password: encrypt(password),
            from_name,
            provider: 'smtp'
        },
            {
                onConflict: 'workspace_id'
            }).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    }
)