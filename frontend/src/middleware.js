import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const adminToken = request.cookies.get('admin_token')?.value;
  const orgToken = request.cookies.get('organization_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isLoggedIn = !!(adminToken || orgToken || refreshToken);

  if (isLoggedIn && (pathname === '/' || pathname === '/login' || pathname.startsWith('/signup'))) {
    if (adminToken) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (orgToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {

      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (!isLoggedIn && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (orgToken && !adminToken && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (adminToken && !orgToken && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*', '/admin/:path*'],
};
