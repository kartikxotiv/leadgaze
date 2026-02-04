import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from "~/utils/response-handler";

export const submitSMTPDetails = catchAsync(
    async ({ request }: { request: NextRequest }) => {
        const body = await request.json();
        const supabase = getSupabaseServerClient();

        const {
            workspace_id,
            email,
            host,
            port,
            secure,
            username,
            password,
            from_name
        } = body;

        const { data, error } = await supabase.from("email_accounts").upsert({
            workspace_id,
            email,
            host,
            port,
            secure,
            username,
            password,
            from_name,
            provider: 'smtp'
        },
            {
                onConflict: 'workspace_id, email'
            }).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    }
)