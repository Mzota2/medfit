import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { Notification, NotificationType } from '@/types/notification';
import { NotFoundError } from '@/lib/utils/errors';
import { createNotification } from './create';

export { createNotification };
export * from './helpers';

/**
 * Get notification by ID
 */
export const getNotificationById = async (notificationId: string): Promise<Notification> => {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  const notificationSnap = await getDoc(notificationRef);
  
  if (!notificationSnap.exists()) {
    throw new NotFoundError('Notification');
  }
  
  const data = notificationSnap.data();
  // Convert Firestore Timestamps to JavaScript Date objects
  const notification: Record<string, unknown> = {
    id: notificationSnap.id,
    ...data,
  };
  
  if (data.createdAt?.toDate) {
    notification.createdAt = data.createdAt.toDate();
  } else if (data.createdAt instanceof Timestamp) {
    notification.createdAt = data.createdAt.toDate();
  }
  
  if (data.updatedAt?.toDate) {
    notification.updatedAt = data.updatedAt.toDate();
  } else if (data.updatedAt instanceof Timestamp) {
    notification.updatedAt = data.updatedAt.toDate();
  }
  
  if (data.readAt?.toDate) {
    notification.readAt = data.readAt.toDate();
  } else if (data.readAt instanceof Timestamp) {
    notification.readAt = data.readAt.toDate();
  }
  
  if (data.expiresAt?.toDate) {
    notification.expiresAt = data.expiresAt.toDate();
  } else if (data.expiresAt instanceof Timestamp) {
    notification.expiresAt = data.expiresAt.toDate();
  }
  
  return notification as unknown as Notification;
};

/**
 * Get notifications for a user
 */
export const getNotificationsByUserId = async (userId: string, options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  let q = query(
    notificationsRef,
    where('recipient.userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  if (options?.unreadOnly) {
    // Filter for unread notifications (no readAt field)
    // Note: This requires a composite index in Firestore
    // For now, we'll filter client-side
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  let notifications = querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Convert Firestore Timestamps to JavaScript Date objects
    const notification: Record<string, unknown> = {
      id: doc.id,
      ...data,
    };
    
    if (data.createdAt?.toDate) {
      notification.createdAt = data.createdAt.toDate();
    } else if (data.createdAt instanceof Timestamp) {
      notification.createdAt = data.createdAt.toDate();
    }
    
    if (data.updatedAt?.toDate) {
      notification.updatedAt = data.updatedAt.toDate();
    } else if (data.updatedAt instanceof Timestamp) {
      notification.updatedAt = data.updatedAt.toDate();
    }
    
    if (data.readAt?.toDate) {
      notification.readAt = data.readAt.toDate();
    } else if (data.readAt instanceof Timestamp) {
      notification.readAt = data.readAt.toDate();
    }
    
    if (data.expiresAt?.toDate) {
      notification.expiresAt = data.expiresAt.toDate();
    } else if (data.expiresAt instanceof Timestamp) {
      notification.expiresAt = data.expiresAt.toDate();
    }
    
    return notification as unknown as Notification;
  });
  
  // Filter unread if requested
  if (options?.unreadOnly) {
    notifications = notifications.filter(n => !n.readAt);
  }
  
  return notifications;
};

/**
 * Get notifications by email (for guest users)
 */
export const getNotificationsByEmail = async (email: string, options?: {
  limit?: number;
}): Promise<Notification[]> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  let q = query(
    notificationsRef,
    where('recipient.email', '==', email),
    orderBy('createdAt', 'desc')
  );
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Convert Firestore Timestamps to JavaScript Date objects
    const notification: Record<string, unknown> = {
      id: doc.id,
      ...data,
    };
    
    if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt && typeof data.createdAt.toDate === 'function') {
      notification.createdAt = data.createdAt.toDate();
    } else if (data.createdAt instanceof Timestamp) {
      notification.createdAt = data.createdAt.toDate();
    }
    
    if (data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt && typeof data.updatedAt.toDate === 'function') {
      notification.updatedAt = data.updatedAt.toDate();
    } else if (data.updatedAt instanceof Timestamp) {
      notification.updatedAt = data.updatedAt.toDate();
    }
    
    if (data.readAt && typeof data.readAt === 'object' && 'toDate' in data.readAt && typeof data.readAt.toDate === 'function') {
      notification.readAt = data.readAt.toDate();
    } else if (data.readAt instanceof Timestamp) {
      notification.readAt = data.readAt.toDate();
    }
    
    if (data.expiresAt && typeof data.expiresAt === 'object' && 'toDate' in data.expiresAt && typeof data.expiresAt.toDate === 'function') {
      notification.expiresAt = data.expiresAt.toDate();
    } else if (data.expiresAt instanceof Timestamp) {
      notification.expiresAt = data.expiresAt.toDate();
    }
    
    return notification as unknown as Notification;
  });
};

/**
 * Get notifications with filters
 */
export const getNotifications = async (options?: {
  type?: NotificationType;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  limit?: number;
}): Promise<Notification[]> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  let q = query(notificationsRef);
  
  if (options?.type) {
    q = query(q, where('type', '==', options.type));
  }
  
  if (options?.orderId) {
    q = query(q, where('orderId', '==', options.orderId));
  }
  
  if (options?.bookingId) {
    q = query(q, where('bookingId', '==', options.bookingId));
  }
  
  if (options?.paymentId) {
    q = query(q, where('paymentId', '==', options.paymentId));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Convert Firestore Timestamps to JavaScript Date objects
    const notification: Record<string, unknown> = {
      id: doc.id,
      ...data,
    };
    
    if (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt && typeof data.createdAt.toDate === 'function') {
      notification.createdAt = data.createdAt.toDate();
    } else if (data.createdAt instanceof Timestamp) {
      notification.createdAt = data.createdAt.toDate();
    }
    
    if (data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt && typeof data.updatedAt.toDate === 'function') {
      notification.updatedAt = data.updatedAt.toDate();
    } else if (data.updatedAt instanceof Timestamp) {
      notification.updatedAt = data.updatedAt.toDate();
    }
    
    if (data.readAt && typeof data.readAt === 'object' && 'toDate' in data.readAt && typeof data.readAt.toDate === 'function') {
      notification.readAt = data.readAt.toDate();
    } else if (data.readAt instanceof Timestamp) {
      notification.readAt = data.readAt.toDate();
    }
    
    if (data.expiresAt && typeof data.expiresAt === 'object' && 'toDate' in data.expiresAt && typeof data.expiresAt.toDate === 'function') {
      notification.expiresAt = data.expiresAt.toDate();
    } else if (data.expiresAt instanceof Timestamp) {
      notification.expiresAt = data.expiresAt.toDate();
    }
    
    return notification as unknown as Notification;
  });
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  const notificationSnap = await getDoc(notificationRef);
  
  if (!notificationSnap.exists()) {
    throw new NotFoundError('Notification');
  }
  
  await updateDoc(notificationRef, {
    readAt: serverTimestamp(),
    'deliveryStatus.in_app': 'read',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const notifications = await getNotificationsByUserId(userId);
  const batch = notifications
    .filter(n => !n.readAt)
    .map(n => markNotificationAsRead(n.id!));
  
  await Promise.all(batch);
};
