/**
 * Real-time subscription hook for payments
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToPayments, subscriptionManager } from './firebase-subscriptions';
import { PaymentSession, PaymentSessionStatus } from '@/types/payment';
import { paymentKeys } from './usePayments';

interface UseRealtimePaymentsOptions {
  status?: PaymentSessionStatus;
  orderId?: string;
  bookingId?: string;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time payment updates
 * Updates React Query cache when payments change
 */
export const useRealtimePayments = (options?: UseRealtimePaymentsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `payments-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToPayments(
      (payments: (PaymentSession & { id: string })[]) => {
        console.log('[useRealtimePayments] Received payments:', payments.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          paymentKeys.list({
            status: options?.status,
            orderId: options?.orderId,
            bookingId: options?.bookingId,
            businessId: options?.businessId,
          }),
          payments
        );
      },
      {
        status: options?.status,
        orderId: options?.orderId,
        bookingId: options?.bookingId,
        businessId: options?.businessId,
        limit: options?.limit,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimePayments] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.status,
    options?.orderId,
    options?.bookingId,
    options?.businessId,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

