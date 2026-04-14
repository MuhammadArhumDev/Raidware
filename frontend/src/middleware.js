import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  const adminToken = request.cookies.get('admin_token')?.value;
  const orgToken = request.cookies.get('organization_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isLoggedIn = !!(adminToken || orgToken || refreshToken);

  // If authenticated user visits / (home) or /login, redirect to correct dashboard
  if (isLoggedIn && (pathname === '/' || pathname === '/login' || pathname.startsWith('/signup'))) {
    if (adminToken) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (orgToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // If we only have refresh_token, default to /dashboard
      // Client-side auth state will handle further redirection if they are admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If user is trying to access protected routes without being logged in
  if (!isLoggedIn && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Role-based protection between user and admin
  // Organization user trying to access admin routes
  if (orgToken && !adminToken && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Admin trying to access organization routes
  if (adminToken && !orgToken && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*', '/admin/:path*'],
};
