/**
 * Customer Notifications Page
 * Displays all notifications for the current user
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Package, Calendar, CreditCard } from 'lucide-react';
import { Button, Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsByUserId, useNotificationsByEmail, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { formatRelativeTime } from '@/lib/utils/formatting';
import { NotificationType } from '@/types/notification';
import { Timestamp } from 'firebase/firestore';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications based on user authentication
  const { data: notificationsByUserId, isLoading: loadingByUserId } = useNotificationsByUserId(
    user?.uid,
    { enabled: !!user?.uid }
  );
  
  const { data: notificationsByEmail, isLoading: loadingByEmail } = useNotificationsByEmail(
    user?.email || undefined,
    { enabled: !user?.uid && !!user?.email }
  );

  // Real-time updates for notifications (critical data - user needs immediate updates)
  useRealtimeNotifications({
    userId: user?.uid,
    email: user?.email || undefined,
    enabled: !!user,
  });

  // Use the appropriate notifications list
  const allNotifications = user?.uid ? notificationsByUserId : notificationsByEmail;
  const isLoading = user?.uid ? loadingByUserId : loadingByEmail;

  // Filter notifications
  const notifications = filter === 'unread' 
    ? (allNotifications || []).filter(n => !n.readAt)
    : (allNotifications || []);

  const unreadCount = (allNotifications || []).filter(n => !n.readAt).length;

  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      await markAllAsRead.mutateAsync(user.uid);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ORDER_PAID:
      case NotificationType.ORDER_SHIPPED:
      case NotificationType.ORDER_COMPLETED:
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
      case NotificationType.BOOKING_PAID:
      case NotificationType.BOOKING_CONFIRMED:
      case NotificationType.BOOKING_COMPLETED:
      case NotificationType.BOOKING_CANCELED:
        return <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
      case NotificationType.PAYMENT_SUCCESS:
      case NotificationType.PAYMENT_FAILED:
        return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
      default:
        return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
    }
  };

  const getNotificationLink = (notification: typeof notifications[0]) => {
    if (notification.orderId) {
      return `/orders/${notification.orderId}`;
    }
    if (notification.bookingId) {
      return `/bookings/${notification.bookingId}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary py-4 sm:py-6 lg:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Notifications</h1>
              <p className="text-sm sm:text-base text-text-secondary">
                {unreadCount > 0 
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : 'All caught up! No new notifications.'}
              </p>
            </div>
            {unreadCount > 0 && user?.uid && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                isLoading={markAllAsRead.isPending}
                className="flex items-center gap-2 w-full sm:w-auto shrink-0"
                size="sm"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark All as Read</span>
                <span className="sm:hidden">Mark All Read</span>
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-border overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                filter === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-foreground'
              }`}
            >
              All ({allNotifications?.length || 0})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 relative whitespace-nowrap ${
                filter === 'unread'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-foreground'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 sm:ml-2 bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 sm:px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {notifications && notifications.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const link = getNotificationLink(notification);
              const NotificationContent = (
                <div
                  className={`bg-card rounded-lg shadow-sm p-3 sm:p-4 border-l-4 transition-all ${
                    isUnread
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                    <div className="flex items-start gap-3 sm:gap-4">
                    <div className="shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="grow min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
                        <div className="grow min-w-0">
                          <h3 className={`font-semibold text-foreground mb-1 text-sm sm:text-base ${isUnread ? 'sm:text-lg' : ''}`}>
                            {notification.title}
                          </h3>
                          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                            {notification.body}
                          </p>
                        </div>
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (notification.id) {
                                handleMarkAsRead(notification.id);
                              }
                            }}
                            className="shrink-0 p-1.5 hover:bg-background-secondary rounded-lg transition-colors"
                            title="Mark as read"
                            disabled={markAsRead.isPending}
                          >
                            <Check className="w-4 h-4 text-text-secondary hover:text-primary" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mt-2 sm:mt-3">
                        <span className="text-xs text-text-secondary">
                          {notification.createdAt 
                            ? (() => {
                                try {
                                  let date: Date;
                                  const createdAt = notification.createdAt;
                                  if (createdAt instanceof Date) {
                                    date = createdAt;
                                  } else if (createdAt instanceof Timestamp) {
                                    date = createdAt.toDate();
                                  } else if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
                                    const timestampLike = createdAt as { toDate: () => Date };
                                    date = timestampLike.toDate();
                                  } else {
                                    date = new Date(createdAt as string | number);
                                  }
                                  return formatRelativeTime(date);
                                } catch {
                                  return 'Just now';
                                }
                              })()
                            : 'Just now'}
                        </span>
                        {notification.metadata && (() => {
                          const meta = notification.metadata as {
                            orderNumber?: string | number;
                            bookingNumber?: string | number;
                          };
                          const hasOrder = meta?.orderNumber !== undefined;
                          const hasBooking = meta?.bookingNumber !== undefined;
                          if (!hasOrder && !hasBooking) return null;
                          return (
                          <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                              {hasOrder && (
                                <span className="truncate">Order #{String(meta.orderNumber)}</span>
                            )}
                              {hasBooking && (
                                <span className="truncate">Booking #{String(meta.bookingNumber)}</span>
                            )}
                          </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (link) {
                return (
                  <Link key={notification.id} href={link} className="block">
                    {NotificationContent}
                  </Link>
                );
              }

              return (
                <div key={notification.id}>
                  {NotificationContent}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
            <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-text-secondary mx-auto mb-3 sm:mb-4 opacity-50" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
              {filter === 'unread' 
                ? 'You&apos;re all caught up! Check back later for new updates.'
                : 'You don&apos;t have any notifications yet. Notifications about your orders, bookings, and payments will appear here.'}
            </p>
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Continue Shopping</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

