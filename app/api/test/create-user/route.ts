import { NextResponse } from "next/server";
import { User } from "@/models";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
   
    const hashedPassword = await bcrypt.hash("password123", 12);

    const user = await User.create({
      email: "test@example.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
