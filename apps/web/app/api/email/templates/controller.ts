import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.from("email_templates").select("*");
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const payload = await req.json();
    const { name, slug, subject, html_body, text_body, variables } = payload;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.from("email_templates").insert({
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
