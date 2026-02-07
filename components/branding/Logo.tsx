/**
 * Logo component with dynamic branding
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';
import { useApp } from '@/contexts/AppContext';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'text-only' | 'icon-only';
  className?: string;
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'default',
  className,
  href = '/',
}) => {
  const { currentBusiness } = useApp();
  
  // Get business name from AppContext, fallback to 'Techcure'
  const businessName = currentBusiness?.name || '';
  
  const sizes = {
    sm: 'w-18 h-18',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const logoContent = (
    <div className={cn('flex items-center', className)}>
      {/* Icon */}
      {(variant === 'default' || variant === 'icon-only') && (
        <div className={cn(
          'flex items-center justify-center shrink-0',
          sizes[size]
        )}>
          <Image
            className="w-full h-full" 
            src="/logo.png" 
            alt={`${businessName} logo`}
            width={400}
            height={400}
            priority
          />
        </div>
      )}
      
      {/* Text */}
      {/* {(variant === 'default' || variant === 'text-only') && (
        <span className={cn(
          'font-bold text-foreground',
          textSizes[size]
        )}>
          {businessName}
        </span>
      )} */}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

