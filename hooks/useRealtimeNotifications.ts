/**
 * Real-time subscription hook for notifications
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToNotifications, subscriptionManager } from './firebase-subscriptions';
import { Notification } from '@/types/notification';
import { notificationKeys } from './useNotifications';

interface UseRealtimeNotificationsOptions {
  userId?: string;
  email?: string;
  unreadOnly?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time notification updates
 * Updates React Query cache when notifications change
 */
export const useRealtimeNotifications = (options?: UseRealtimeNotificationsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `notifications-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToNotifications(
      (notifications: Notification[]) => {
        console.log('[useRealtimeNotifications] Received notifications:', notifications.length, {
          userId: options?.userId,
          email: options?.email,
        });
        
        // Update React Query cache with new data
        if (options?.userId) {
          queryClient.setQueryData(
            notificationKeys.byUserId(options.userId, { unreadOnly: options?.unreadOnly }),
            notifications
          );
        } else if (options?.email) {
          queryClient.setQueryData(notificationKeys.byEmail(options.email), notifications);
        } else {
          // Update general notifications list
          queryClient.setQueryData(notificationKeys.list({}), notifications);
        }
      },
      {
        userId: options?.userId,
        email: options?.email,
        unreadOnly: options?.unreadOnly,
        limit: options?.limit,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeNotifications] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.userId,
    options?.email,
    options?.unreadOnly,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

