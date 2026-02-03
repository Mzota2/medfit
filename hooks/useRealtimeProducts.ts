/**
 * Real-time subscription hook for products
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToProducts, subscriptionManager } from './firebase-subscriptions';
import { Item, ItemStatus } from '@/types/item';
import { productKeys } from './useProducts';

interface UseRealtimeProductsOptions {
  businessId?: string;
  status?: ItemStatus;
  categoryId?: string;
  enabled?: boolean;
}

/**
 * Subscribe to real-time product updates
 * Updates React Query cache when products change
 */
export const useRealtimeProducts = (options?: UseRealtimeProductsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `products-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToProducts(
      (products: Item[]) => {
        console.log('[useRealtimeProducts] Received products:', products.length, {
          businessId: options?.businessId,
          status: options?.status,
          categoryId: options?.categoryId,
        });
        // Update React Query cache with new data
        queryClient.setQueryData(
          productKeys.list({
            businessId: options?.businessId,
            status: options?.status,
            categoryId: options?.categoryId,
          }),
          products
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
      console.error('[useRealtimeProducts] Error setting up subscription:', error);
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

