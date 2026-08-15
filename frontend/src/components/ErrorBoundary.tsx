'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback title, e.g. "This page failed to load." */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches unexpected render/runtime errors in its subtree so a single broken
 * component can't take down the whole app (or dashboard) with a blank white screen.
 * This is a last-resort safety net for bugs, not a substitute for handling
 * expected API/data errors — those should be caught and displayed where they occur.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an unexpected error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {this.props.title || 'Something went wrong while displaying this page.'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Please try again. If the problem keeps happening, contact support.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
