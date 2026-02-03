/**
 * Real-time subscription hook for services
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToServices, subscriptionManager } from './firebase-subscriptions';
import { Item, ItemStatus } from '@/types/item';
import { serviceKeys } from './useServices';

interface UseRealtimeServicesOptions {
  businessId?: string;
  status?: ItemStatus;
  categoryId?: string;
  enabled?: boolean;
}

/**
 * Subscribe to real-time service updates
 * Updates React Query cache when services change
 */
export const useRealtimeServices = (options?: UseRealtimeServicesOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `services-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToServices(
      (services: Item[]) => {
        // Update React Query cache with new data
        queryClient.setQueryData(
          serviceKeys.list({
            businessId: options?.businessId,
            status: options?.status,
            categoryId: options?.categoryId,
          }),
          services
        );
      },
      {
        businessId: options?.businessId,
        status: options?.status,
        categoryId: options?.categoryId,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeServices] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.businessId,
    options?.status,
    options?.categoryId,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

