'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to role-specific dashboard
      const rolePath = `/dashboard/${user.role.toLowerCase()}`;
      console.log('🔄 Dashboard page redirecting to:', rolePath);
      router.push(rolePath);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Please log in to access your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
        <p className="mt-6 text-text-secondary text-lg font-medium">Redirecting to {user.role} dashboard...</p>
      </div>
    </div>
  );
}
