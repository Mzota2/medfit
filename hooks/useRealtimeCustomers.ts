/**
 * Real-time subscription hook for customers
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToCustomers, subscriptionManager } from './firebase-subscriptions';
import { User } from '@/types/user';
import { customerKeys } from './useCustomers';

interface UseRealtimeCustomersOptions {
  enabled?: boolean;
}

/**
 * Subscribe to real-time customer updates
 * Updates React Query cache when customers change
 */
export const useRealtimeCustomers = (options?: UseRealtimeCustomersOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = 'customers';

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToCustomers(
      (customers: User[]) => {
        console.log('[useRealtimeCustomers] Received customers:', customers.length);
        // Update React Query cache with new data
        queryClient.setQueryData(customerKeys.list(), customers);
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeCustomers] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

