import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing model connections...");

   
    const tests = [];

    // Test each table
    const models = [
      'users',
      'organizations',
      'user_organizations',
      'user_sessions',
      'user_config',
      'organization_config',
      'organization_roles',
      'leads',
      'leads_config',
    ];

    for (const model of models) {
      try {
        const { count } = await supabase
          .from(model)
          .select('*', { count: 'exact', head: true });
        tests.push({ model: model, status: "✅", count: count || 0 });
      } catch (error) {
        tests.push({
          model: model,
          status: "❌",
          error: (error as Error).message,
        });
      }
    }

    // Additional tests for other tables
    const additionalModels = [
      'tasks',
      'deals',
      'activities',
      'notifications',
      'automation_rules',
      'scoring_rules',
      'lead_scores',
    ];

    for (const model of additionalModels) {
      try {
        const { count } = await supabase
          .from(model)
          .select('*', { count: 'exact', head: true });
        tests.push({ model: model, status: "✅", count: count || 0 });
      } catch (error) {
        tests.push({
          model: model,
          status: "❌",
          error: (error as Error).message,
        });
      }
    }

    // Calculate summary
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
