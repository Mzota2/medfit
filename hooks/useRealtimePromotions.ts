/**
 * Real-time subscription hook for promotions
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToPromotions, subscriptionManager } from './firebase-subscriptions';
import { Promotion, PromotionStatus } from '@/types/promotion';
import { promotionKeys } from './usePromotions';

interface UseRealtimePromotionsOptions {
  status?: PromotionStatus;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time promotion updates
 * Updates React Query cache when promotions change
 */
export const useRealtimePromotions = (options?: UseRealtimePromotionsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `promotions-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToPromotions(
      (promotions: Promotion[]) => {
        console.log('[useRealtimePromotions] Received promotions:', promotions.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          promotionKeys.list({
            status: options?.status,
            businessId: options?.businessId,
          }),
          promotions
        );
      },
      {
        status: options?.status,
        businessId: options?.businessId,
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.status,
    options?.businessId,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

