/**
 * Real-time subscription hook for categories
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToCategories, subscriptionManager } from './firebase-subscriptions';
import { Category } from '@/types/category';
import { categoryKeys } from './useCategories';

interface UseRealtimeCategoriesOptions {
  type?: 'product' | 'service' | 'both';
  businessId?: string;
  enabled?: boolean;
}

/**
 * Subscribe to real-time category updates
 * Updates React Query cache when categories change
 */
export const useRealtimeCategories = (options?: UseRealtimeCategoriesOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `categories-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToCategories(
      (categories: Category[]) => {
        console.log('[useRealtimeCategories] Received categories:', categories.length, {
          type: options?.type,
          businessId: options?.businessId,
        });
        // Update React Query cache with new data
        queryClient.setQueryData(
          categoryKeys.list({
            type: options?.type,
            businessId: options?.businessId,
          }),
          categories
        );
      },
      {
        type: options?.type,
        businessId: options?.businessId,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.type,
    options?.businessId,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

