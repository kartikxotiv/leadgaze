import { NextResponse } from "next/server";

export async function GET(
    _: Request,
    { params }: { params: { threadId: string } }
) {
    // New schema does not support querying by thread_id on emails table yet.
    return NextResponse.json([]);
}
