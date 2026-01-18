import { NextResponse } from "next/server";
import { createUser } from "@/lib/data/users";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 12);

    const user = await createUser({
      email: "test@example.com",
      password: hashedPassword,
      first_name: "Test",
      last_name: "User",
      email_verified: false,
      login_attempts: 0,
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
