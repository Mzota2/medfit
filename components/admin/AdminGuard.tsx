/**
 * Admin authentication guard - protects admin routes
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { Loading } from '@/components/ui';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the login route (intercepting route)
  const isLoginRoute = pathname === '/login' || pathname?.startsWith('/login');

  useEffect(() => {
    // Wait for loading to complete and userRole to be determined
    if (!loading && !isLoginRoute) {
      // Only redirect if we have a user but they're not admin/staff
      // Don't redirect if userRole is still null (might still be loading from Firestore)
      if (user && userRole !== null && userRole !== UserRole.ADMIN && userRole !== UserRole.STAFF) {
        router.replace('/');
        return;
      }
    }
  }, [user, userRole, loading, router, isLoginRoute, pathname]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // If user is not authenticated or doesn't have admin/staff role, show login modal
  if (!user || (userRole !== UserRole.ADMIN && userRole !== UserRole.STAFF)) {
    // If we're already on the login route, let the intercepting route handle it
    if (isLoginRoute) {
      return <>{children}</>;
    }
    
    // Otherwise, show the login modal overlay
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background-secondary">
          <Loading />
        </div>
        <AdminLoginModal />
      </>
    );
  }

  return <>{children}</>;
};

