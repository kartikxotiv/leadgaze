import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

// CORS headers helper - Allow all origins for live API
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://leadgaze.vercel.app',
    process.env.NEXT_PUBLIC_API_URL || '',
    'https://*.vercel.app',
  ].filter(Boolean);
  
  // Allow any origin if it matches patterns
  const isAllowed = origin && (
    allowedOrigins.some(allowed => origin.includes(allowed.replace('*.', ''))) ||
    origin.includes('localhost') ||
    origin.includes('vercel.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { 
    headers: getCorsHeaders(origin) 
  });
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();

   
    if (!body.email || !body.password) {
      const origin = request.headers.get('origin');
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: email, password",
        },
        { 
          status: 400,
          headers: getCorsHeaders(origin),
        }
      );
    }

   
    const organizationSlug = body.organizationSlug || body.orgSlug;
    const organizationId = body.organizationId;

   
    const result = await AuthService.loginUser(
      body.email,
      body.password,
      false,
      organizationId,
      organizationSlug
    );

    const origin = request.headers.get('origin');
    return NextResponse.json({
      success: true,
      user: {
        userId: (result.user as any).userId,
        email: (result.user as any).email,
        firstName: (result.user as any).firstName,
        lastName: (result.user as any).lastName,
      },
      token: result.token,
      organizations: result.organizations,
      currentOrganization: result.currentOrganization,
    }, {
      headers: getCorsHeaders(origin),
    });
  } catch (error: any) {
    // Handle Supabase errors (they're plain objects, not Error instances)
    let errorMessage = "Unknown error";
    let errorStack = "No stack";
    let errorCode = null;
    let errorDetails: any = null;
    
    if (error instanceof Error) {
      // Standard Error instance
      errorMessage = error.message;
      errorStack = error.stack || "No stack";
      errorDetails = {
        name: error.name,
        cause: error.cause,
      };
    } else if (error && typeof error === 'object') {
      // Supabase error object or other plain object errors
      errorMessage = error.message || error.error?.message || "Unknown error";
      errorCode = error.code || error.error?.code;
      errorDetails = {
        code: errorCode,
        hint: error.hint || error.error?.hint,
        details: error.details || error.error?.details,
        statusCode: error.status || error.error?.status,
      };
      
      // If we have a Supabase error, format it better
      if (error.code || error.error?.code) {
        const supabaseError = error.error || error;
        errorMessage = supabaseError.message || `Database error: ${supabaseError.code || 'UNKNOWN'}`;
      }
    }
    
    // Enhanced error logging
    console.error("❌ Login error:", errorMessage);
    console.error("📍 Error code:", errorCode || "N/A");
    console.error("🔍 Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error("📋 Error details:", {
      message: errorMessage,
      code: errorCode,
      type: error instanceof Error ? error.name : typeof error,
      body: body ? { email: body.email, hasPassword: !!body.password } : null,
      ...errorDetails,
    });

    // Handle specific error types
    if (
      errorMessage.includes("Invalid email or password") ||
      errorMessage.includes("Account is locked") ||
      errorMessage.includes("User has no organizations")
    ) {
      const origin = request.headers.get('origin');
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { code: errorCode }),
        },
        { 
          status: 401,
          headers: getCorsHeaders(origin),
        }
      );
    }

    // Return detailed error
    const origin = request.headers.get('origin');
    return NextResponse.json(
      {
        success: false,
        error: "Login failed",
        details: errorMessage,
        ...(errorCode && { code: errorCode }),
        // Only show extra details in development
        ...(process.env.NODE_ENV === 'development' && {
          errorType: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? (error.stack || "No stack") : "No stack (non-Error object)",
          fullError: errorDetails,
        }),
      },
      { 
        status: 500,
        headers: getCorsHeaders(origin),
      }
    );
  }
}
