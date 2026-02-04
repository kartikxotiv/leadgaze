import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(req: Request) {
    const body = await req.json();
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

    const { data, error } = await supabase.from("email_accounts").insert({
        workspace_id,
        email,
        host,
        port,
        secure,
        username,
        password,
        from_name,
        provider: 'smtp'
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
