/**
 * Store Type Route Guard
 * Redirects users away from pages they shouldn't access based on store type
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStoreType } from '@/hooks/useStoreType';
import { Loading } from '@/components/ui';

interface StoreTypeGuardProps {
  children: React.ReactNode;
  requireProducts?: boolean;
  requireServices?: boolean;
  redirectTo?: string;
}

export const StoreTypeGuard: React.FC<StoreTypeGuardProps> = ({
  children,
  requireProducts = false,
  requireServices = false,
  redirectTo = '/',
}) => {
  const router = useRouter();
  const { hasProducts, hasServices, isLoading } = useStoreType();

  useEffect(() => {
    if (isLoading) return;

    if (requireProducts && !hasProducts) {
      router.push(redirectTo);
    }

    if (requireServices && !hasServices) {
      router.push(redirectTo);
    }
  }, [hasProducts, hasServices, isLoading, requireProducts, requireServices, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" />
      </div>
    );
  }

  // Don't render children if requirements not met
  if (requireProducts && !hasProducts) {
    return null;
  }

  if (requireServices && !hasServices) {
    return null;
  }

  return <>{children}</>;
};

