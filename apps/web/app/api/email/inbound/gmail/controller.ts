import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(req: Request) {
    const payload = await req.json();
    const supabase = getSupabaseServerClient();

    // Example parsed message
    const {
        gmail_message_id,
        from,
        to,
        subject,
        html,
        text,
        snippet,
        received_at
    } = payload;

    // 1. Resolve Workspace ID
    // We assume 'to' contains our user's email. We extract it to find the workspace.
    // 'to' can be "Name <email@com>", so we might need parsing.
    // For simplicity, we search validation against email_accounts.

    // Simplistic extraction (improve if needed with a library)
    const toEmail = Array.isArray(to) ? to[0] : to;
    // In reality 'to' might be a comma separated string or array depending on upstream parser.
    // Assuming simple string or finding first match.

    // We try to find an account that matches one of the recipients
    const { data: account } = await supabase
        .from("email_accounts")
        .select("workspace_id")
        .ilike("email", `%${toEmail}%`) // Very loose matching, ideal would be exact
        .maybeSingle();

    if (!account) {
        return NextResponse.json({ error: "No matching workspace found for recipient" }, { status: 404 });
    }

    const workspace_id = account.workspace_id;

    // Save email
    await supabase.from("emails").insert({
        workspace_id,
        gmail_message_id,
        // thread_id, // Removed in new schema
        direction: "inbound",
        from_email: from,
        to_emails: to,
        subject,
        html_body: html,
        text_body: text,
        snippet,
        received_at
    });

    return NextResponse.json({ success: true });
}
