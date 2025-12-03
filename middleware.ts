import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Whitelist AI system endpoints so they are not redirected to login
  // Note: run-auto-monitor is under (system)/api/ai for CRON access
  if (
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/ai/run-auto-monitor") ||
    pathname.startsWith("/api/ai/run-daily-coaching")
  ) {
    return NextResponse.next();
  }

  // If you have existing auth, add it below
  return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
