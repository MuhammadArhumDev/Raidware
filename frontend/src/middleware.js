import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// This function can be marked `async` if using `await` inside
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Checking request for: ${pathname}`);

  if (pathname.startsWith("/admin")) {
    // Debug cookies
    const allCookies = request.cookies.getAll();
    console.log(
      "[Middleware] All Cookies:",
      allCookies.map((c) => c.name)
    );

    // Check for admin_token cookie
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      console.log("[Middleware] No admin_token cookie found. Redirecting to /");
      return NextResponse.redirect(new URL("/", request.url));
    }

    console.log("[Middleware] admin_token found. Verifying...");

    try {
      const secretValue = process.env.JWT_ACCESS_SECRET;
      if (!secretValue) {
        console.error(
          "[Middleware] CRITICAL: JWT_ACCESS_SECRET is missing in environment variables!"
        );
        throw new Error("Missing JWT_ACCESS_SECRET");
      }

      const secret = new TextEncoder().encode(secretValue);
      const { payload } = await jwtVerify(token, secret);

      console.log("[Middleware] Token verified. Payload role:", payload.role);

      // Check role
      if (payload.role !== "admin") {
        console.log(
          `[Middleware] Role mismatch. Expected 'admin', got '${payload.role}'`
        );
        throw new Error("Not admin");
      }

      console.log("[Middleware] Access granted.");
      return NextResponse.next();
    } catch (error) {
      console.error("[Middleware] Auth Error:", error.message);
      // Redirect to login if verification fails
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/admin/:path*",
};
