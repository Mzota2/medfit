/**
 * Switch/Toggle Component
 */

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, disabled = false, label, className }: SwitchProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-background-secondary transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
            checked ? 'translate-x-6 bg-primary' : 'translate-x-1'
          )}
        />
      </div>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

