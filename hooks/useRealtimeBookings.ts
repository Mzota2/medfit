/**
 * Real-time subscription hook for bookings
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToBookings, subscriptionManager } from './firebase-subscriptions';
import { Booking, BookingStatus } from '@/types/booking';
import { bookingKeys } from './useBookings';

interface UseRealtimeBookingsOptions {
  customerId?: string;
  customerEmail?: string;
  serviceId?: string;
  status?: BookingStatus;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time booking updates
 * Updates React Query cache when bookings change
 */
export const useRealtimeBookings = (options?: UseRealtimeBookingsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `bookings-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToBookings(
      (bookings: Booking[]) => {
        console.log('[useRealtimeBookings] Received bookings:', bookings.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          bookingKeys.list({
            customerId: options?.customerId,
            customerEmail: options?.customerEmail,
            serviceId: options?.serviceId,
            status: options?.status,
          }),
          bookings
        );
      },
      {
        customerId: options?.customerId,
        customerEmail: options?.customerEmail,
        serviceId: options?.serviceId,
        status: options?.status,
        limit: options?.limit,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeBookings] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.customerId,
    options?.customerEmail,
    options?.serviceId,
    options?.status,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

