/**
 * Input component with icon support
 */

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, icon, iconPosition = 'left', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              error && 'border-destructive focus:ring-destructive',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-sm text-text-secondary">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

