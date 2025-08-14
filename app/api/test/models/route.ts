import { NextRequest, NextResponse } from "next/server";
import {
  User,
  Organization,
  UserOrganization,
  UserSession,
  UserConfig,
  OrganizationConfig,
  OrganizationRole,
  Lead,
  LeadConfig,
} from "@/models";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing model connections...");

    // Test basic model queries
    const tests = [];

    // Test User model
    try {
      const userCount = await User.count();
      tests.push({ model: "User", status: "✅", count: userCount });
    } catch (error) {
      tests.push({
        model: "User",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Test Organization model
    try {
      const orgCount = await Organization.count();
      tests.push({ model: "Organization", status: "✅", count: orgCount });
    } catch (error) {
      tests.push({
        model: "Organization",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Test UserOrganization model
    try {
      const userOrgCount = await UserOrganization.count();
      tests.push({
        model: "UserOrganization",
        status: "✅",
        count: userOrgCount,
      });
    } catch (error) {
      tests.push({
        model: "UserOrganization",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Test UserSession model
    try {
      const sessionCount = await UserSession.count();
      tests.push({ model: "UserSession", status: "✅", count: sessionCount });
    } catch (error) {
      tests.push({
        model: "UserSession",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Test config models
    try {
      const userConfigCount = await UserConfig.count();
      tests.push({ model: "UserConfig", status: "✅", count: userConfigCount });
    } catch (error) {
      tests.push({
        model: "UserConfig",
        status: "❌",
        error: (error as Error).message,
      });
    }

    try {
      const orgConfigCount = await OrganizationConfig.count();
      tests.push({
        model: "OrganizationConfig",
        status: "✅",
        count: orgConfigCount,
      });
    } catch (error) {
      tests.push({
        model: "OrganizationConfig",
        status: "❌",
        error: (error as Error).message,
      });
    }

    try {
      const roleCount = await OrganizationRole.count();
      tests.push({ model: "OrganizationRole", status: "✅", count: roleCount });
    } catch (error) {
      tests.push({
        model: "OrganizationRole",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Test CRM models
    try {
      const leadCount = await Lead.count();
      tests.push({ model: "Lead", status: "✅", count: leadCount });
    } catch (error) {
      tests.push({
        model: "Lead",
        status: "❌",
        error: (error as Error).message,
      });
    }

    try {
      const leadConfigCount = await LeadConfig.count();
      tests.push({ model: "LeadConfig", status: "✅", count: leadConfigCount });
    } catch (error) {
      tests.push({
        model: "LeadConfig",
        status: "❌",
        error: (error as Error).message,
      });
    }

    // Summary
    const passed = tests.filter((t) => t.status === "✅").length;
    const failed = tests.filter((t) => t.status === "❌").length;

    return NextResponse.json({
      success: true,
      message: "Model connectivity test completed",
      summary: {
        total: tests.length,
        passed,
        failed,
        status: failed === 0 ? "ALL_PASS" : "SOME_FAILURES",
      },
      tests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Model test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Model test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
