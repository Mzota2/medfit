/**
 * Notification utility functions for checking settings
 */

import { getSettings } from '@/lib/settings';
import { NotificationType } from '@/types/notification';

/**
 * Check if a notification type should be created based on settings
 */
export const shouldCreateNotification = async (type: NotificationType): Promise<boolean> => {
  try {
    const settings = await getSettings();
    const notificationSettings = settings?.notifications;

    // If notifications are globally disabled, don't create any
    if (!notificationSettings?.enabled) {
      return false;
    }

    // Check specific notification type
    switch (type) {
      // Critical notifications
      case NotificationType.ORDER_PAID:
        return notificationSettings.orderPaid ?? true;
      case NotificationType.BOOKING_PAID:
        return notificationSettings.bookingPaid ?? true;
      case NotificationType.ORDER_COMPLETED:
        return notificationSettings.orderCompleted ?? true;
      case NotificationType.BOOKING_COMPLETED:
        return notificationSettings.bookingCompleted ?? true;
      
      // Optional notifications
      case NotificationType.PAYMENT_SUCCESS:
        return notificationSettings.paymentSuccess ?? false;
      case NotificationType.PAYMENT_FAILED:
        return notificationSettings.paymentFailed ?? false;
      case NotificationType.ORDER_CREATED:
        return notificationSettings.orderCreated ?? false;
      case NotificationType.ORDER_SHIPPED:
        return notificationSettings.orderShipped ?? false;
      case NotificationType.ORDER_CANCELED:
        return notificationSettings.orderCanceled ?? false;
      case NotificationType.BOOKING_CREATED:
        return notificationSettings.bookingCreated ?? false;
      case NotificationType.BOOKING_CONFIRMED:
        return notificationSettings.bookingConfirmed ?? false;
      case NotificationType.BOOKING_CANCELED:
        return notificationSettings.bookingCanceled ?? false;
      case NotificationType.BOOKING_REMINDER:
        return notificationSettings.bookingReminder ?? false;
      case NotificationType.CUSTOMER_SUPPORT:
        return notificationSettings.customerSupport ?? false;
      case NotificationType.ADMIN_SUPPORT:
        return notificationSettings.adminSupport ?? false;
      case NotificationType.SYSTEM_ALERT:
        return notificationSettings.systemAlert ?? false;
      
      default:
        // Unknown notification types default to false
        return false;
    }
  } catch (error) {
    console.error('Error checking notification settings:', error);
    // On error, default to allowing critical notifications only
    return [
      NotificationType.ORDER_PAID,
      NotificationType.BOOKING_PAID,
      NotificationType.ORDER_COMPLETED,
      NotificationType.BOOKING_COMPLETED,
    ].includes(type);
  }
};

