import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/data/accounts";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Account ID is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch account",
      },
      { status: 500 }
    );
  }
}
