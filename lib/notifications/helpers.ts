/**
 * Helper functions for creating notifications for different events
 */

import { createNotification } from './create';
import { NotificationType, NotificationChannel, NotificationRecipient } from '@/types/notification';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';

/**
 * Create notification for payment success
 */
export async function notifyPaymentSuccess(data: {
  customerEmail: string;
  customerId?: string;
  amount: number;
  currency: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  orderNumber?: string;
  bookingNumber?: string;
}): Promise<void> {
  try {
    const recipient: NotificationRecipient = {
      userId: data.customerId,
      email: data.customerEmail,
    };

    const title = data.orderId 
      ? `Payment Successful - Order #${data.orderNumber || data.orderId}`
      : data.bookingId
      ? `Payment Successful - Booking #${data.bookingNumber || data.bookingId}`
      : 'Payment Successful';

    const body = data.orderId
      ? `Your payment of ${data.amount} ${data.currency} for order #${data.orderNumber || data.orderId} has been successfully processed.`
      : data.bookingId
      ? `Your payment of ${data.amount} ${data.currency} for booking #${data.bookingNumber || data.bookingId} has been successfully processed.`
      : `Your payment of ${data.amount} ${data.currency} has been successfully processed.`;

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {
      amount: data.amount,
      currency: data.currency,
    };
    if (data.orderNumber) {
      metadata.orderNumber = data.orderNumber;
    }
    if (data.bookingNumber) {
      metadata.bookingNumber = data.bookingNumber;
    }

    const notificationId = await createNotification({
      type: NotificationType.PAYMENT_SUCCESS,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      orderId: data.orderId,
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata,
    });
    console.log('Payment success notification created:', notificationId, {
      orderId: data.orderId,
      bookingId: data.bookingId,
      customerEmail: data.customerEmail,
    });
  } catch (error) {
    console.error('Error creating payment success notification:', error);
    if (error instanceof Error) {
      console.error('Notification error details:', {
        message: error.message,
        stack: error.stack,
        data: { orderId: data.orderId, bookingId: data.bookingId, customerEmail: data.customerEmail },
      });
    }
  }
}

/**
 * Create notification for payment failure
 */
export async function notifyPaymentFailed(data: {
  customerEmail: string;
  customerId?: string;
  amount: number;
  currency: string;
  reason?: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  orderNumber?: string;
  bookingNumber?: string;
}): Promise<void> {
  try {
    const recipient: NotificationRecipient = {
      userId: data.customerId,
      email: data.customerEmail,
    };

    const title = data.orderId
      ? `Payment Failed - Order #${data.orderNumber || data.orderId}`
      : data.bookingId
      ? `Payment Failed - Booking #${data.bookingNumber || data.bookingId}`
      : 'Payment Failed';

    const body = data.reason
      ? `Your payment of ${data.amount} ${data.currency} failed. Reason: ${data.reason}`
      : `Your payment of ${data.amount} ${data.currency} could not be processed. Please try again.`;

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {
      amount: data.amount,
      currency: data.currency,
    };
    if (data.reason) {
      metadata.reason = data.reason;
    }
    if (data.orderNumber) {
      metadata.orderNumber = data.orderNumber;
    }
    if (data.bookingNumber) {
      metadata.bookingNumber = data.bookingNumber;
    }

    const notificationId = await createNotification({
      type: NotificationType.PAYMENT_FAILED,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      orderId: data.orderId,
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata,
    });
    if (notificationId) {
      console.log('Payment failure notification created:', notificationId);
    }
  } catch (error) {
    console.error('Error creating payment failure notification:', error);
    if (error instanceof Error) {
      console.error('Notification error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

/**
 * Create notification for order status change
 */
export async function notifyOrderStatusChange(data: {
  customerEmail: string;
  customerId?: string;
  orderId: string;
  orderNumber?: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
}): Promise<void> {
  try {
    // Only notify for specific status changes
    if (![OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(data.status)) {
      return;
    }

    const recipient: NotificationRecipient = {
      userId: data.customerId,
      email: data.customerEmail,
    };

    let title: string;
    let body: string;
    let type: NotificationType;

    switch (data.status) {
      case OrderStatus.PAID:
        type = NotificationType.ORDER_PAID;
        title = `Order Paid - #${data.orderNumber || data.orderId}`;
        body = `Your order #${data.orderNumber || data.orderId} has been paid and is being processed.`;
        break;
      case OrderStatus.SHIPPED:
        type = NotificationType.ORDER_SHIPPED;
        title = `Order Shipped - #${data.orderNumber || data.orderId}`;
        body = `Your order #${data.orderNumber || data.orderId} has been shipped and is on its way to you.`;
        break;
      case OrderStatus.COMPLETED:
        type = NotificationType.ORDER_COMPLETED;
        title = `Order Completed - #${data.orderNumber || data.orderId}`;
        body = `Your order #${data.orderNumber || data.orderId} has been completed. Thank you for your purchase!`;
        break;
      default:
        return;
    }

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {
      status: data.status,
    };
    if (data.orderNumber) {
      metadata.orderNumber = data.orderNumber;
    }
    if (data.previousStatus) {
      metadata.previousStatus = data.previousStatus;
    }

    const notificationId = await createNotification({
      type,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      orderId: data.orderId,
      metadata,
    });
    console.log('Order status notification created:', notificationId, {
      orderId: data.orderId,
      status: data.status,
    });
  } catch (error) {
    console.error('Error creating order status notification:', error);
    if (error instanceof Error) {
      console.error('Notification error details:', {
        message: error.message,
        stack: error.stack,
        data: { orderId: data.orderId, status: data.status },
      });
    }
  }
}

/**
 * Create notification for booking status change
 */
export async function notifyBookingStatusChange(data: {
  customerEmail: string;
  customerId?: string;
  bookingId: string;
  bookingNumber?: string;
  status: BookingStatus;
  previousStatus?: BookingStatus;
}): Promise<void> {
  try {
    // Only notify for specific status changes
    if (![BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.COMPLETED].includes(data.status)) {
      return;
    }

    const recipient: NotificationRecipient = {
      userId: data.customerId,
      email: data.customerEmail,
    };

    let title: string;
    let body: string;
    let type: NotificationType;

    switch (data.status) {
      case BookingStatus.PAID:
        type = NotificationType.BOOKING_PAID;
        title = `Booking Paid - #${data.bookingNumber || data.bookingId}`;
        body = `Your booking #${data.bookingNumber || data.bookingId} has been paid and is being confirmed.`;
        break;
      case BookingStatus.CONFIRMED:
        type = NotificationType.BOOKING_CONFIRMED;
        title = `Booking Confirmed - #${data.bookingNumber || data.bookingId}`;
        body = `Your booking #${data.bookingNumber || data.bookingId} has been confirmed. We look forward to serving you!`;
        break;
      case BookingStatus.COMPLETED:
        type = NotificationType.BOOKING_COMPLETED;
        title = `Booking Completed - #${data.bookingNumber || data.bookingId}`;
        body = `Your booking #${data.bookingNumber || data.bookingId} has been completed. Thank you for choosing us!`;
        break;
      default:
        return;
    }

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {
      status: data.status,
    };
    if (data.bookingNumber) {
      metadata.bookingNumber = data.bookingNumber;
    }
    if (data.previousStatus) {
      metadata.previousStatus = data.previousStatus;
    }

    const notificationId = await createNotification({
      type,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      bookingId: data.bookingId,
      metadata,
    });
    console.log('Booking status notification created:', notificationId, {
      bookingId: data.bookingId,
      status: data.status,
    });
  } catch (error) {
    console.error('Error creating booking status notification:', error);
    if (error instanceof Error) {
      console.error('Notification error details:', {
        message: error.message,
        stack: error.stack,
        data: { bookingId: data.bookingId, status: data.status },
      });
    }
  }
}

/**
 * Create notification for booking cancellation
 */
export async function notifyBookingCancellation(data: {
  customerEmail: string;
  customerId?: string;
  bookingId: string;
  bookingNumber?: string;
  reason?: string;
  refundAmount?: number;
  currency?: string;
}): Promise<void> {
  try {
    const recipient: NotificationRecipient = {
      userId: data.customerId,
      email: data.customerEmail,
    };

    const title = `Booking Cancelled - #${data.bookingNumber || data.bookingId}`;
    let body = `Your booking #${data.bookingNumber || data.bookingId} has been cancelled.`;
    
    if (data.reason) {
      body += ` Reason: ${data.reason}`;
    }
    
    if (data.refundAmount && data.refundAmount > 0) {
      body += ` A refund of ${data.refundAmount} ${data.currency || 'MWK'} will be processed.`;
    }

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {};
    if (data.bookingNumber) {
      metadata.bookingNumber = data.bookingNumber;
    }
    if (data.reason) {
      metadata.reason = data.reason;
    }
    if (data.refundAmount !== undefined && data.refundAmount !== null) {
      metadata.refundAmount = data.refundAmount;
    }
    if (data.currency) {
      metadata.currency = data.currency;
    }

    await createNotification({
      type: NotificationType.BOOKING_CANCELED,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      bookingId: data.bookingId,
      metadata,
    });
  } catch (error) {
    console.error('Error creating booking cancellation notification:', error);
  }
}

/**
 * Create notification for customer support message (admin notification)
 */
export async function notifyCustomerSupportMessage(data: {
  customerEmail: string;
  customerName?: string;
  customerId?: string;
  subject: string;
  message: string;
  messageId?: string;
}): Promise<void> {
  try {
    // Get business contact email for admin notifications
    // In a real system, you'd fetch admin users from business settings
    // For now, we'll use the business contact email
    const { getBusinessId } = await import('@/lib/businesses/utils');
    const businessId = await getBusinessId();
    
    let adminEmail = 'admin@example.com'; // Default fallback
    
    if (businessId) {
      try {
        const { db } = await import('@/lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        const { COLLECTIONS } = await import('@/types/collections');
        
        const businessRef = doc(db, COLLECTIONS.BUSINESS, businessId);
        const businessSnap = await getDoc(businessRef);
        
        if (businessSnap.exists()) {
          const businessData = businessSnap.data();
          adminEmail = businessData.contactInfo?.email || adminEmail;
        }
      } catch (error) {
        console.error('Error fetching business email for notification:', error);
      }
    }
    
    // Note: userId would be the admin user ID if we had a way to get it
    // For now, notifications will be shown to all admins via email matching
    const recipient: NotificationRecipient = {
      email: adminEmail,
    };

    const title = `New Customer Message: ${data.subject}`;
    const body = `${data.customerName || data.customerEmail} sent a message: ${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}`;

    // Build metadata object, only including fields that have values (Firestore doesn't allow undefined)
    const metadata: Record<string, unknown> = {
      customerEmail: data.customerEmail,
      subject: data.subject,
      message: data.message,
    };
    if (data.customerName) {
      metadata.customerName = data.customerName;
    }
    if (data.customerId) {
      metadata.customerId = data.customerId;
    }
    if (data.messageId) {
      metadata.messageId = data.messageId;
    }

    await createNotification({
      type: NotificationType.ADMIN_SUPPORT,
      title,
      body,
      recipient,
      channels: [NotificationChannel.IN_APP],
      metadata,
    });
  } catch (error) {
    console.error('Error creating customer support notification:', error);
  }
}

