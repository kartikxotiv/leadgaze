import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
   
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

   
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded.user_id;

   
    const organizations = await AuthService.getUserOrganizations(userId);

   
    const currentOrganization = organizations[0] || null;

    return NextResponse.json({
      success: true,
      organizations,
      currentOrganization,
    });
  } catch (error) {
    console.error("Organizations fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch organizations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
