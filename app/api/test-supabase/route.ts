import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  try {
    console.log("🧪 Testing Supabase connection...");
    
    // Test 1: Check connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name')
      .limit(1);
    
    if (testError) {
      console.error("❌ Supabase connection error:", testError);
      return NextResponse.json({
        success: false,
        error: "Supabase connection failed",
        details: testError.message,
        code: testError.code,
        hint: testError.hint,
      }, { status: 500 });
    }
    
    // Test 2: Check if users table exists and has data
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Test 3: Try to get a specific user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@admin.com')
      .single();
    
    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      tests: {
        connection: "✅ Connected",
        tableAccess: testError ? "❌ Failed" : "✅ Success",
        usersCount: count || 0,
        sampleUser: testData ? "✅ Found" : "⚠️ No users",
        adminUser: userError?.code === 'PGRST116' 
          ? "⚠️ admin@admin.com not found" 
          : userError 
          ? `❌ Error: ${userError.message}` 
          : "✅ Found",
        adminUserData: userData ? {
          user_id: userData.user_id,
          email: userData.email,
          first_name: userData.first_name,
          has_password: !!userData.password,
        } : null,
      },
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL,
        supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.substring(0, 30) + "...",
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json({
      success: false,
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

