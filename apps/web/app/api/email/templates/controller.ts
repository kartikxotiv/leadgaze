import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get("workspace_id");

    if (!workspace_id) {
        return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data } = await supabase
        .from("workspace_email_templates")
        .select("*")
        .eq("workspace_id", workspace_id);

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const payload = await req.json();
    const {
        workspace_id,
        name,
        slug,
        subject,
        html_body,
        text_body,
        variables
    } = payload;

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.from("workspace_email_templates").insert({
        workspace_id,
        name,
        slug,
        subject,
        html_body,
        text_body,
        variables
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
}
