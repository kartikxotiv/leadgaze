import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/data/users";
import jwt from "jsonwebtoken";
import { AuthService } from "@/lib/auth-service";
import { supabase } from "@/lib/supabase-client";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { success: false, error: "emails array is required" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Normalize emails
    const normalizedEmails = emails.map((email: string) =>
      email.toLowerCase().trim()
    );

    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .in("email", normalizedEmails);

    if (usersError) {
      console.error("Error fetching users by emails:", usersError);
      throw usersError;
    }

    return NextResponse.json({
      success: true,
      users: usersData || [],
      totalUsers: usersData?.length || 0,
    });
  } catch (error) {
    console.error("Error in by-emails API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users by emails",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
