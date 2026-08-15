'use client';

import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

/** Full-area spinner for a page/section that's fetching its initial data. */
export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-text-secondary text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

/**
 * Distinct from EmptyState: use this when the request itself failed (network,
 * timeout, 4xx/5xx) — never for "the API succeeded but returned zero records".
 */
export function ErrorState({
  message = "We couldn't load this information. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

/** Use only when the request succeeded and genuinely returned no records. */
export function EmptyState({
  message = 'No records found.',
  icon,
  action,
}: {
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <p className="text-gray-500 mb-4">{message}</p>
      {action}
    </div>
  );
}
