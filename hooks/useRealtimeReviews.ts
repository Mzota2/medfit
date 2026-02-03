/**
 * Real-time subscription hook for reviews
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToReviews, subscriptionManager } from './firebase-subscriptions';
import { Review } from '@/types/reviews';
import { reviewKeys } from './useReviews';

interface UseRealtimeReviewsOptions {
  itemId?: string;
  userId?: string;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time review updates
 * Updates React Query cache when reviews change
 */
export const useRealtimeReviews = (options?: UseRealtimeReviewsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `reviews-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToReviews(
      (reviews: Review[]) => {
        console.log('[useRealtimeReviews] Received reviews:', reviews.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          reviewKeys.list({
            itemId: options?.itemId,
            userId: options?.userId,
            businessId: options?.businessId,
          }),
          reviews
        );
      },
      {
        itemId: options?.itemId,
        userId: options?.userId,
        businessId: options?.businessId,
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.itemId,
    options?.userId,
    options?.businessId,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

