import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(req: Request) {
    const payload = await req.json();
    const supabase = getSupabaseServerClient();

    // Example parsed message
    const {
        gmail_message_id,
        thread_id,
        from,
        to,
        subject,
        html,
        text,
        snippet,
        received_at
    } = payload;

    // Upsert thread
    await supabase.from("email_threads").upsert({
        id: thread_id,
        subject,
        last_message_at: received_at
    });

    // Save email
    await supabase.from("emails").insert({
        gmail_message_id,
        thread_id,
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
