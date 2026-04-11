'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Temporary redirect to users page for production
    router.push('/dashboard/admin/users');
  }, [router]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Redirecting to Users...</p>
        </div>
      </div>
    </div>
  );
}
