/**
 * Real-time subscription hook for admins/staff
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToAdminsStaff, subscriptionManager } from './firebase-subscriptions';
import { User } from '@/types/user';
import { adminsStaffKeys } from './useAdminsStaff';

interface UseRealtimeAdminsStaffOptions {
  role?: 'admin' | 'staff';
  enabled?: boolean;
}

/**
 * Subscribe to real-time admin/staff updates
 * Updates React Query cache when users change
 */
export const useRealtimeAdminsStaff = (options?: UseRealtimeAdminsStaffOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `admins-staff-${options?.role || 'all'}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToAdminsStaff(
      (users: User[]) => {
        console.log('[useRealtimeAdminsStaff] Received users:', users.length);
        // Update React Query cache with new data
        queryClient.setQueryData(adminsStaffKeys.list({ role: options?.role }), users);
        
        // Also update role-specific caches
        const admins = users.filter((u) => u.role === 'admin');
        const staff = users.filter((u) => u.role === 'staff');
        
        if (!options?.role || options.role === 'admin') {
          queryClient.setQueryData(adminsStaffKeys.admins(), admins);
        }
        if (!options?.role || options.role === 'staff') {
          queryClient.setQueryData(adminsStaffKeys.staff(), staff);
        }
      },
      options?.role
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.role,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

