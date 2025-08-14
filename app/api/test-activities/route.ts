import { NextRequest, NextResponse } from "next/server";

// Simple test route to check if basic API routing works
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Test API route is working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Test API route failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Test API received POST:", body);

    return NextResponse.json({
      success: true,
      message: "Test POST endpoint working",
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test POST failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
