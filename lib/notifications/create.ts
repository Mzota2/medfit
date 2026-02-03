/**
 * Server-side notification creation
 * Notifications are created server-side only and stored in Firestore
 */

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import { CreateNotificationInput, Notification, NotificationChannel, NotificationDeliveryStatus } from '@/types/notification';
import { shouldCreateNotification } from './utils';

/**
 * Create a notification in Firestore
 * This should be called from server-side code (API routes, Cloud Functions)
 * Checks settings to determine if notification should be created
 */
export const createNotification = async (
  input: CreateNotificationInput
): Promise<string | null> => {
  // Check if this notification type should be created
  const shouldCreate = await shouldCreateNotification(input.type);
  if (!shouldCreate) {
    console.log(`Notification type ${input.type} is disabled in settings. Skipping creation.`);
    return null;
  }

  // Initialize delivery status for all channels
  const deliveryStatus: Record<NotificationChannel, NotificationDeliveryStatus> = {
    [NotificationChannel.IN_APP]: NotificationDeliveryStatus.PENDING,
    [NotificationChannel.PUSH]: NotificationDeliveryStatus.PENDING,
    [NotificationChannel.EMAIL]: NotificationDeliveryStatus.PENDING,
    [NotificationChannel.SMS]: NotificationDeliveryStatus.PENDING,
  };

  // Automatically get businessId
  const { getBusinessId } = await import('@/lib/businesses/utils');
  const businessId = await getBusinessId();

  // Build notification object, only including fields that have values (Firestore doesn't allow undefined)
  const notification: Omit<Notification, 'id'> = {
    type: input.type,
    title: input.title,
    body: input.body,
    recipient: input.recipient,
    channels: input.channels,
    deliveryStatus,
    businessId,
    ...(input.orderId && { orderId: input.orderId }),
    ...(input.bookingId && { bookingId: input.bookingId }),
    ...(input.paymentId && { paymentId: input.paymentId }),
    ...(input.metadata && { metadata: input.metadata }),
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
    ...(input.expiresAt && { expiresAt: input.expiresAt }),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    notification
  );

  // Trigger delivery for each channel
  // This would typically be done via Cloud Functions
  // For now, we just create the notification record

  return docRef.id;
};

/**
 * Send push notification via FCM
 * This should be called from Cloud Functions
 */
export const sendPushNotification = async (
  fcmToken: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> => {
  // This should be implemented in Cloud Functions using firebase-admin
  // Example:
  // await admin.messaging().send({
  //   token: fcmToken,
  //   notification: {
  //     title: notification.title,
  //     body: notification.body,
  //   },
  //   data: data || {},
  // });
  
  console.log('Push notification would be sent:', { fcmToken, notification, data });
};

/**
 * Send email notification
 * Future implementation
 */
export const sendEmailNotification = async (
  email: string,
  subject: string,
  body: string
): Promise<void> => {
  // Future implementation
  console.log('Email notification would be sent:', { email, subject, body });
};

/**
 * Send SMS notification
 * Future implementation
 */
export const sendSMSNotification = async (
  phone: string,
  message: string
): Promise<void> => {
  // Future implementation
  console.log('SMS notification would be sent:', { phone, message });
};

