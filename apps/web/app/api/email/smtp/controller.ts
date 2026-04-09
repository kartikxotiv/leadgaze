import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from "~/utils/response-handler";
import { encrypt } from "~/utils/crypto";
import { getWorkspaceMemberContext } from '~/lib/email/email-account-access';

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
            from_name,
            imap_host,
            imap_port,
            imap_secure,
            access_scope
        } = body;

        const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);
        if (!memberContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const sanitizedAccessScope =
            memberContext.isAdmin && access_scope === 'workspace'
                ? 'workspace'
                : 'private';

        const { data, error } = await supabase.from("email_accounts").upsert({
            workspace_id: workspaceId,
            email,
            host,
            port,
            secure,
            username,
            password: encrypt(password),
            from_name,
            imap_host,
            imap_port,
            imap_secure,
            provider: 'smtp',
            owner_user_id: memberContext.userId,
            access_scope: sanitizedAccessScope,
            is_active: true,
            is_sync_enabled: true,
        } as any, {
            onConflict: 'workspace_id,email'
        }).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    }
)
