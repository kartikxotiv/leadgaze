import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(req: Request) {
    const body = await req.json();
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

    const { data, error } = await supabase.from("email_smtp_accounts").insert({
        email,
        host,
        port,
        secure,
        username,
        password,
        from_name
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
