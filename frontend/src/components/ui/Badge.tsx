import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-primary-light text-primary border border-primary/20',
      secondary: 'bg-orange-500 text-white border border-orange-600',
      destructive: 'bg-red-100 text-red-700 border border-red-200',
      outline: 'border border-border text-text-primary bg-transparent',
      success: 'bg-green-100 text-green-700 border border-green-200',
      warning: 'bg-orange-500 text-white border border-orange-600',
      info: 'bg-blue-500 text-white border border-blue-600',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
