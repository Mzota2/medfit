/**
 * Real-time subscription hook for orders
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToOrders, subscriptionManager } from './firebase-subscriptions';
import { Order, OrderStatus } from '@/types/order';
import { orderKeys } from './useOrders';

interface UseRealtimeOrdersOptions {
  customerId?: string;
  customerEmail?: string;
  status?: OrderStatus;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time order updates
 * Updates React Query cache when orders change
 */
export const useRealtimeOrders = (options?: UseRealtimeOrdersOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `orders-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToOrders(
      (orders: Order[]) => {
        console.log('[useRealtimeOrders] Received orders:', orders.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          orderKeys.list({
            customerId: options?.customerId,
            customerEmail: options?.customerEmail,
            status: options?.status,
          }),
          orders
        );
      },
      {
        customerId: options?.customerId,
        customerEmail: options?.customerEmail,
        status: options?.status,
        limit: options?.limit,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeOrders] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.customerId,
    options?.customerEmail,
    options?.status,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

