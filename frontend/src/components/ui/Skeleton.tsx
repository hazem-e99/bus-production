'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-border-light', className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="h-4 w-1/3 bg-border-light rounded mb-4 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-border-light rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-border-light rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-border-light rounded animate-pulse" />
      </div>
    </div>
  );
}


