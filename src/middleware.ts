import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We check if the request is targeting an admin route
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";

  if (isAdminRoute) {
    const token = request.cookies.get("admin_token")?.value;
    
    // Verify the JWT token
    const payload = token ? await verifyJWT(token) : null;

    if (!payload && !isLoginRoute) {
      // Not logged in and trying to access a protected admin page -> redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (payload && isLoginRoute) {
      // Logged in and trying to access the login page -> redirect to dashboard
      const dashboardUrl = new URL("/admin", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/admin/:path*"],
};
