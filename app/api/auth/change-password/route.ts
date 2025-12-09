import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUserById, updateUser } from "@/lib/data/users";
import { emailService } from "@/lib/email-service";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Current password, new password, and confirm password are required",
        },
        { status: 400 }
      );
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password and confirm password do not match",
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    // Get user
    const userId = decoded.userId;
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password not set for this account. Please use password reset.",
        },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be different from current password",
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await updateUser(userId, {
      password: hashedPassword,
      password_changed_at: new Date().toISOString(),
      login_attempts: 0,
      lock_until: undefined,
    });

    // Send confirmation email
    try {
      await emailService.ensureInitialized();
      const userOrganizations = await AuthService.getUserOrganizations(userId);
      const currentOrganization = userOrganizations[0];

      await emailService.sendPasswordChangedEmail(
        user.email,
        user.first_name || "",
        user.last_name || "",
        currentOrganization?.name
      );
    } catch (emailError) {
      // Log but don't fail the password change
      console.error("Failed to send password change email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Password has been changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while changing password. Please try again.",
      },
      { status: 500 }
    );
  }
}
