/**
 * Real-time subscription hook for businesses
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToBusinesses, subscriptionManager } from './firebase-subscriptions';
import { business } from '@/types/business';
import { businessKeys } from './useBusiness';

interface UseRealtimeBusinessesOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time business updates
 * Updates React Query cache when businesses change
 */
export const useRealtimeBusinesses = (options?: UseRealtimeBusinessesOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `businesses-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToBusinesses(
      (businesses: business[]) => {
        console.log('[useRealtimeBusinesses] Received businesses:', businesses.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          businessKeys.list({ limit: options?.limit }),
          businesses
        );
      },
      {
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

