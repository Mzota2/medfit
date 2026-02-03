/**
 * React Query hooks for Notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getNotificationsByUserId,
  getNotificationsByEmail,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';
import { Notification, NotificationType } from '@/types/notification';

/**
 * Query key factory for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: {
    type?: NotificationType;
    orderId?: string;
    bookingId?: string;
    paymentId?: string;
  }) => [...notificationKeys.lists(), filters] as const,
  byUserId: (userId: string, filters?: { unreadOnly?: boolean }) =>
    [...notificationKeys.all, 'user', userId, filters] as const,
  byEmail: (email: string) => [...notificationKeys.all, 'email', email] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
};

/**
 * Fetch notifications with filters
 */
export const useNotifications = (options?: {
  type?: NotificationType;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: notificationKeys.list({
      type: options?.type,
      orderId: options?.orderId,
      bookingId: options?.bookingId,
      paymentId: options?.paymentId,
    }),
    queryFn: async () => {
      return await getNotifications({
        type: options?.type,
        orderId: options?.orderId,
        bookingId: options?.bookingId,
        paymentId: options?.paymentId,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch notifications by user ID
 */
export const useNotificationsByUserId = (
  userId: string | undefined,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: notificationKeys.byUserId(userId || '', { unreadOnly: options?.unreadOnly }),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return await getNotificationsByUserId(userId, {
        limit: options?.limit,
        unreadOnly: options?.unreadOnly,
      });
    },
    enabled: options?.enabled !== false && !!userId,
  });
};

/**
 * Fetch notifications by email
 */
export const useNotificationsByEmail = (email: string | undefined, options?: { limit?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: notificationKeys.byEmail(email || ''),
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      return await getNotificationsByEmail(email, { limit: options?.limit });
    },
    enabled: options?.enabled !== false && !!email,
  });
};

/**
 * Fetch single notification by ID
 */
export const useNotification = (notificationId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: notificationKeys.detail(notificationId || ''),
    queryFn: async () => {
      if (!notificationId) throw new Error('Notification ID is required');
      return await getNotificationById(notificationId);
    },
    enabled: options?.enabled !== false && !!notificationId,
  });
};

/**
 * Mark notification as read mutation
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await markNotificationAsRead(notificationId);
      return notificationId;
    },
    onSuccess: (notificationId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.detail(notificationId) });
    },
  });
};

/**
 * Mark all notifications as read mutation
 */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await markAllNotificationsAsRead(userId);
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.byUserId(userId) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

