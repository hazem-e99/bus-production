'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (!isLoading && user) {
      // Redirect to role-specific dashboard if on generic dashboard
      const currentPath = window.location.pathname;
      if (currentPath === '/dashboard') {
        let rolePath = `/dashboard/${user.role.toLowerCase()}`;
        
        // For admin users, redirect to users page instead of dashboard (temporary for production)
        if (user.role.toLowerCase() === 'admin') {
          rolePath = '/dashboard/admin/users';
        }
        
        console.log('🔄 Redirecting from generic dashboard to:', rolePath);
        router.push(rolePath);
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div suppressHydrationWarning>
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
