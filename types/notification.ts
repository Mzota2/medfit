/**
 * Notification types and delivery channels
 */

import { BaseDocument } from './common';

/**
 * Notification type/category
 */
export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_PAID = 'order_paid',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELED = 'order_canceled',
  BOOKING_CREATED = 'booking_created',
  BOOKING_PAID = 'booking_paid',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_COMPLETED = 'booking_completed',
  BOOKING_CANCELED = 'booking_canceled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SYSTEM_ALERT = 'system_alert',
  CUSTOMER_SUPPORT = 'customer_support',
  ADMIN_SUPPORT = 'admin_support',
}

/**
 * Notification delivery channel
 */
export enum NotificationChannel {
  IN_APP = 'in_app', // Mandatory - stored in Firestore
  PUSH = 'push', // FCM push notification
  EMAIL = 'email', // Future
  SMS = 'sms', // Future
}

/**
 * Notification sender
/**
 * Notification sender
 */
export interface NotificationSender {
  userId?: string; // Firebase Auth UID (null for guest)
  email?: string;
}

/**
 * Notification delivery status
 */
export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read', // For in-app notifications
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  userId?: string; // Firebase Auth UID (null for guest)
  email: string;
  fcmToken?: string; // For push notifications
}

/**
 * Notification document
 */
export interface Notification extends BaseDocument {
  type: NotificationType;
  title: string;
  body: string;
  recipient: NotificationRecipient;
  sender?: NotificationSender;
  channels: NotificationChannel[]; // Which channels to use
  deliveryStatus: Record<NotificationChannel, NotificationDeliveryStatus>;
  orderId?: string; // Related order
  bookingId?: string; // Related booking
  paymentId?: string; // Related payment
  metadata?: Record<string, unknown>;
  readAt?: Date | string; // When user read it (in-app)
  expiresAt?: Date | string; // Optional expiration
}

/**
 * Create notification input (server-side only)
 */
export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | string;
}

