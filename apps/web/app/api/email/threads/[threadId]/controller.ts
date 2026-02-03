import { NextResponse } from "next/server";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
    _: Request,
    { params }: { params: { threadId: string } }
) {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
        .from("emails")
        .select("*")
        .eq("thread_id", params.threadId)
        .order("created_at", { ascending: true });

    return NextResponse.json(data);
}
