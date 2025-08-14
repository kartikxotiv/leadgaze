import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Simple test route working",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: "POST test successful",
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "POST test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
