/**
 * Real-time subscription hook for delivery providers
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToDeliveryProviders, subscriptionManager } from './firebase-subscriptions';
import { DeliveryProvider } from '@/types/delivery';
import { deliveryProviderKeys } from './useDeliveryProviders';

interface UseRealtimeDeliveryProvidersOptions {
  businessId?: string;
  isActive?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time delivery provider updates
 * Updates React Query cache when providers change
 */
export const useRealtimeDeliveryProviders = (options?: UseRealtimeDeliveryProvidersOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `delivery-providers-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToDeliveryProviders(
      (providers: (DeliveryProvider & { id: string })[]) => {
        console.log('[useRealtimeDeliveryProviders] Received providers:', providers.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          deliveryProviderKeys.list({
            businessId: options?.businessId,
            isActive: options?.isActive,
          }),
          providers
        );
      },
      {
        businessId: options?.businessId,
        isActive: options?.isActive,
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.businessId,
    options?.isActive,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

