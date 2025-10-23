import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected and auth routes
const protectedRoutes = [
  "/pages/dashboard",
  "/pages/leads",
  "/pages/team",
  "/pages/deals",
  "/pages/tasks",
  "/pages/pipeline",
  "/pages/communications",
  "/pages/reports",
  // Legacy routes for backward compatibility
  "/dashboard",
  "/deals",
  "/tasks",
  "/pipeline",
  "/communications",
  "/reports",
];
const authRoutes = [
  "/pages/auth/sign-in",
  "/pages/auth/sign-up",
  "/pages/auth/forgot-password",
  "/pages/auth/reset-password",
];
const publicRoutes = ["/auth/accept-invitation"];
const welcomeRoutes = ["/pages/auth/sign-in"]; // Special handling for welcome page

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth token or session
  const sessionId = request.cookies.get("auth_session")?.value;
  const authToken = request.cookies.get("auth_token")?.value;

  // User is authenticated if they have either session ID or auth token
  const isAuthenticated = !!(sessionId || authToken);

  console.log(`🛡️ Middleware: ${pathname} - Auth: ${isAuthenticated}`);
  console.log(`🍪 Session ID: ${sessionId ? "present" : "missing"}`);
  console.log(`🔑 Auth Token: ${authToken ? "present" : "missing"}`);

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(
        isAuthenticated ? "/pages/dashboard" : "/pages/auth/sign-in",
        request.url
      )
    );
  }

  // Protected routes - require authentication
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      console.log(`🚫 Redirecting ${pathname} to welcome`);
      // Temporary bypass for team page testing
      if (pathname === "/pages/team") {
        console.log(`⚠️ TEMPORARY: Allowing team page access for testing`);
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/pages/welcome", request.url));
    }
    return NextResponse.next();
  }

  // Auth routes - redirect to dashboard if already authenticated
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      console.log(`🔄 Already authenticated, redirecting to dashboard`);
      return NextResponse.redirect(new URL("/pages/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Welcome page - redirect authenticated users to dashboard
  if (welcomeRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      console.log(
        `🔄 Already authenticated, redirecting from welcome to dashboard`
      );
      return NextResponse.redirect(new URL("/pages/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Public routes - always allow
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Default: redirect based on auth status
  return NextResponse.redirect(
    new URL(
      isAuthenticated ? "/pages/dashboard" : "/pages/welcome",
      request.url
    )
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public|image).*)",
  ],
};
