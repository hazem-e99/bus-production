"use client";
import { ReactNode } from "react";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useI18n } from '@/contexts/LanguageContext';

export default function LayoutShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const userRole = user?.role || 'student';
  const { isRTL } = useI18n();

  // Define routes that should not have the main layout (Topbar + Sidebar)
  const authRoutes = [
    '/auth/login',
    '/auth/register', 
    '/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/new-password',
    '/auth/verification',
    '/auth/reset-password-verification'
  ];

  // Check if current route is an auth route or the root welcome page
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isTripsRoute = pathname.startsWith('/trips');
  const isLayoutRoute = isDashboardRoute || isTripsRoute;

  // Client-side auth guard: prevent rendering any non-auth route without login
  useEffect(() => {
    if (!isAuthRoute && !isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isAuthRoute, isLoading, user, router]);

  // If it's an auth route, render children without layout
  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  // Only render full layout for selected routes when user exists
  if (isLayoutRoute && user) {
    return (
      <div className="min-h-screen bg-background" suppressHydrationWarning>
        <Sidebar userRole={userRole} />
        <div className={isRTL ? 'lg:mr-72' : 'lg:ml-72'}>
          <Topbar />
          <main className="pt-4 px-3 sm:px-6">{children}</main>
        </div>
      </div>
    );
  }

  // For all non-dashboard routes (including 404), render without layout
  // If user is not logged in, the effect above will redirect; render nothing to avoid flicker
  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>{(user || isAuthRoute || isLoading) ? children : null}</div>
  );
}
