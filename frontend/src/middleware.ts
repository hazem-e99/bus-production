import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userCookie = request.cookies.get('user');

  // Public routes that don't require authentication (prefix match)
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/new-password',
    '/auth/verification',
    '/auth/reset-password-verification',
  ];

  const isRootPublic = pathname === '/';
  const isPublicRoute = isRootPublic || publicRoutes.some(route => pathname.startsWith(route));
  
  // Handle dashboard routing
  if (pathname === '/dashboard') {
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie.value));
        const role = user.role?.toLowerCase() || 'student';
        const redirectUrl = `/dashboard/${role}`;
        
        console.log('🔄 Middleware redirecting to:', redirectUrl);
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      } catch (error: unknown) {
        console.error('Error parsing user cookie:', error);
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // If the route is not public and user is not authenticated, redirect to login
  if (!isPublicRoute && !userCookie) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Handle case sensitivity issues
  if (pathname.includes('/dashboard/Student')) {
    return NextResponse.redirect(new URL(pathname.replace('/Student', '/student'), request.url));
  }
  
  if (pathname.includes('/dashboard/Admin')) {
    return NextResponse.redirect(new URL(pathname.replace('/Admin', '/admin'), request.url));
  }
  
  if (pathname.includes('/dashboard/Supervisor')) {
    return NextResponse.redirect(new URL(pathname.replace('/Supervisor', '/supervisor'), request.url));
  }
  
  if (pathname.includes('/dashboard/Driver')) {
    return NextResponse.redirect(new URL(pathname.replace('/Driver', '/driver'), request.url));
  }
  
  if (pathname.includes('/dashboard/Movement-manager')) {
    return NextResponse.redirect(new URL(pathname.replace('/Movement-manager', '/movement-manager'), request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all app routes except Next.js internals and static assets
    '/((?!_next/|favicon.ico|favico2n.ico|api/).*)',
  ],
};
