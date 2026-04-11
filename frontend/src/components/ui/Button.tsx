'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm hover:shadow-md active:scale-[0.98]';
    
    const variantClasses = {
      default: 'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg',
      destructive: 'bg-error text-white hover:bg-red-600 shadow-md hover:shadow-lg',
      outline: 'border border-border bg-transparent text-text-primary hover:bg-card-hover hover:border-primary/50 hover:text-primary',
      secondary: 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg',
      ghost: 'text-text-primary hover:bg-card-hover hover:text-primary',
      link: 'text-primary underline-offset-4 hover:underline hover:text-primary-hover',
    };
    
    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3 py-1.5 text-sm',
      lg: 'h-12 px-6 py-3 text-base',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
